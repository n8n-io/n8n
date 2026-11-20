import { isRecord } from '@n8n/utils/is-record';
import type { HttpVendorProfile } from './http-profiles';

const MAX_BUSY = 100;
const MAX_FREEBUSY_CALENDARS = 4;

// `/calendar/v3/calendars/<calendar>`, then `/events` and `/events/<event>` with an optional action.
const CALENDAR_IN_PATH = /^\/calendar\/v3\/calendars\/([^/]+)(?:\/events(?:\/([^/]+))?)?(?:\/|$)/;
// Names after `/events/` that are actions of the collection, not event ids.
const EVENT_ACTIONS: ReadonlySet<string> = new Set(['quickAdd', 'import', 'watch']);
const CALENDAR_LIST_ENTRY = /^\/calendar\/v3\/users\/me\/calendarList\/([^/]+)$/;
const COLORS = '/calendar/v3/colors';

const safeDecode = (text: string): string => {
	try {
		return decodeURIComponent(text);
	} catch {
		return text;
	}
};

const isPrimary = (calendar: string): boolean => calendar === 'primary';

const timeOf = (value: unknown): string | undefined => {
	if (!isRecord(value)) return undefined;
	const text = value.dateTime ?? value.date;
	return typeof text === 'string' ? text : undefined;
};

function enrichEvent(event: Record<string, unknown>): Record<string, unknown> {
	const startAt = timeOf(event.start);
	const endAt = timeOf(event.end);
	if (startAt === undefined && endAt === undefined) return event;
	const attendees = Array.isArray(event.attendees) ? event.attendees : [];
	return {
		...event,
		...(startAt !== undefined && { startAt }),
		...(endAt !== undefined && { endAt }),
		isAllDay: isRecord(event.start) && typeof event.start.date === 'string',
		attendeeEmails: attendees.flatMap((a) =>
			isRecord(a) && typeof a.email === 'string' ? [a.email] : [],
		),
	};
}

function busyIntervals(calendars: Record<string, unknown>): unknown[] {
	const found: unknown[] = [];
	for (const [calendar, entry] of Object.entries(calendars)) {
		const busy = isRecord(entry) && Array.isArray(entry.busy) ? entry.busy : [];
		for (const interval of busy) {
			if (isRecord(interval)) found.push({ calendar, start: interval.start, end: interval.end });
		}
	}
	return found.slice(0, MAX_BUSY);
}

/** Adds flat fields to events (`startAt`, `endAt`, `isAllDay`, `attendeeEmails`) and to a freeBusy answer (`busyIntervals`). */
export function enrichCalendar(json: unknown): unknown {
	if (!isRecord(json)) return json;
	if (isRecord(json.calendars)) {
		return { ...json, busyIntervals: busyIntervals(json.calendars) };
	}
	if (Array.isArray(json.items)) {
		return {
			...json,
			items: json.items.map((item) => (isRecord(item) ? enrichEvent(item) : item)),
		};
	}
	return enrichEvent(json);
}

const calendarRead = (calendar: string) => ({
	tool: 'read_get_calendar_calendars',
	args: { method: 'GET', path: `/calendar/v3/calendars/${encodeURIComponent(calendar)}` },
});

const eventRead = (calendar: string, event: string) => ({
	tool: 'read_get_calendar_calendars_events',
	args: {
		method: 'GET',
		path: `/calendar/v3/calendars/${encodeURIComponent(calendar)}/events/${encodeURIComponent(event)}`,
	},
});

// What a path names: the calendar, and the event when there is one. An event id can be a short word
// with no digit, so this reads the place in the path and does not guess from the look of the id.
function namedInPath(path: string): { calendar: string; event?: string } | undefined {
	const match = CALENDAR_IN_PATH.exec(path);
	if (!match) return undefined;
	const event = match[2] === undefined ? undefined : safeDecode(match[2]);
	return {
		calendar: safeDecode(match[1]),
		...(event !== undefined && !EVENT_ACTIONS.has(event) && { event }),
	};
}

const CALENDAR_KEYS = ['google_calendar', 'google-calendar'];

// The gym placeholder account owns every calendar and organizes every event. The real organizer is no
// account of the gym tenant, so code removes the owner and the organizer that the plan wrote.
export function withPlaceholderOrganizer(
	overlay: Record<string, unknown>,
): Record<string, unknown> {
	const native = isRecord(overlay.native) ? overlay.native : undefined;
	if (!native) return overlay;
	const strip = (items: unknown) =>
		Array.isArray(items)
			? items.map((item) => {
					if (!isRecord(item)) return item;
					const { owner: _owner, organizer: _organizer, shared_with: _shared, ...kept } = item;
					return kept;
				})
			: items;
	const cleaned: Record<string, unknown> = { ...native };
	for (const key of CALENDAR_KEYS) {
		const block = native[key];
		if (!isRecord(block)) continue;
		cleaned[key] = {
			...block,
			...(block.calendars !== undefined && { calendars: strip(block.calendars) }),
			...(block.events !== undefined && { events: strip(block.events) }),
		};
	}
	return { ...overlay, native: cleaned };
}

const PLACEHOLDER_ACCOUNT = 'guard@unknown.invalid';

export const GOOGLE_CALENDAR_PROFILE: HttpVendorProfile = {
	name: 'googlecalendar',
	gymService: 'google-calendar',
	opaqueIds: true,
	credentialKind: 'google_oauth',
	credentialField: 'oauthTokenData.access_token',
	placeholderSeed: {
		world_version: 1,
		persona: { ref: 'person:me', name: 'Guard', email: PLACEHOLDER_ACCOUNT },
	},
	enrich: enrichCalendar,
	finalize: withPlaceholderOrganizer,
	lookups: (tool, args) => {
		const path = String(args.path);
		if (path === '/calendar/v3/freeBusy') {
			// The request names its calendars in the body. The gym needs each calendar that is not primary.
			const body = isRecord(args.body) ? args.body : undefined;
			const ids = (Array.isArray(body?.items) ? body.items : []).flatMap((item) =>
				isRecord(item) && typeof item.id === 'string' && !isPrimary(item.id) ? [item.id] : [],
			);
			return [...new Set(ids)].slice(0, MAX_FREEBUSY_CALENDARS).map(calendarRead);
		}
		const named = namedInPath(path);
		if (!named) return [];
		const lookups = isPrimary(named.calendar) ? [] : [calendarRead(named.calendar)];
		// A write on an event needs that event in the gym. A read shows the event itself.
		if (tool.startsWith('write_') && named.event !== undefined) {
			lookups.push(eventRead(named.calendar, named.event));
		}
		return lookups;
	},
	hydrateRead: (args) =>
		args.path !== COLORS && CALENDAR_LIST_ENTRY.exec(args.path)?.[1] !== 'primary',
	hydrateWrite: (args, gymIds) => {
		const named = namedInPath(args.path);
		if (!named) return false;
		const needsCalendar = !isPrimary(named.calendar) && !gymIds.has(named.calendar);
		const needsEvent = named.event !== undefined && !gymIds.has(named.event);
		return needsCalendar || needsEvent;
	},
};
