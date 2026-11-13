/**
 * Compiled library node: a hand port of `n8n-nodes-base.googleCalendar`
 * version 1.3, operation `event.getAll`, with OAuth2.
 *
 * Dates: v1 sends a date that ends in `Z` or `+hh:mm` as it is, and any
 * other date as UTC through moment-timezone in the workflow's time zone. The
 * library node does the same for dates with an offset (a negative offset
 * becomes UTC, as moment does it). A date without an offset counts as UTC:
 * the node does not know the workflow's time zone. Without `timeMin` or
 * `timeMax`, v1 takes `$now` and `$now` plus a week in the workflow's time
 * zone; the node sends the same instants in UTC.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface Locator {
	mode?: string;
	value?: string;
}

interface CalendarOptions {
	fields?: string;
	iCalUID?: string;
	maxAttendees?: number;
	orderBy?: string;
	query?: string;
	recurringEventHandling?: string;
	showDeleted?: boolean;
	showHiddenInvitations?: boolean;
	singleEvents?: boolean;
	timeMax?: string | null;
	timeMin?: string | null;
	timeZone?: string | Locator;
	updatedMin?: string;
}

interface CalendarParameters {
	resource?: string;
	operation?: string;
	authentication?: string;
	calendar?: string | Locator;
	returnAll?: boolean;
	limit?: number;
	timeMin?: string;
	timeMax?: string;
	options?: CalendarOptions;
}

interface CalendarEvent {
	id?: string;
	recurrence?: unknown;
	created?: string;
	[key: string]: unknown;
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

function locatorValue(v: string | Locator | undefined): string {
	if (v === undefined) return '';
	return typeof v === 'string' ? v : String(v.value ?? '');
}

/** encodeURIComponentOnce of v1, with the native codecs (spec section 4.3). */
function encodeOnce(text: string): string {
	return encodeURIComponent(decodeURIComponent(text));
}

/** addTimezoneToDate of v1: dates with `Z` or `+hh:mm` stay; others go to UTC. */
function toUtc(date: string): string {
	if (date.endsWith('Z')) return date;
	const tail = date.slice(-6);
	if (tail.length === 6 && tail.charAt(0) === '+' && tail.charAt(3) === ':') {
		const digits = '0123456789';
		if ([1, 2, 4, 5].every((k) => digits.includes(tail.charAt(k)))) return date;
	}
	let ms = Date.parse(
		date.length === 10 || !hasOffset(date)
			? `${date}${date.length === 10 ? 'T00:00:00' : ''}Z`
			: date,
	);
	// A date that is not ISO 8601: moment falls back to `new Date(date + ' UTC')`.
	// The node reads the US form `M/D/YYYY` (the default format of the Date & Time node).
	if (isNaN(ms)) ms = usDate(date);
	if (isNaN(ms)) return 'Invalid date';
	// moment's default format: seconds, no milliseconds.
	return `${new Date(ms).toISOString().slice(0, 19)}Z`;
}

/** Midnight UTC of a `M/D/YYYY` date, or NaN. */
function usDate(date: string): number {
	const parts = date.trim().split('/');
	if (parts.length !== 3) return NaN;
	const digits = '0123456789';
	for (const part of parts) {
		if (part.length === 0 || part.length > 4) return NaN;
		for (let k = 0; k < part.length; k++) if (!digits.includes(part.charAt(k))) return NaN;
	}
	const month = Number(parts[0]);
	const day = Number(parts[1]);
	const year = Number(parts[2]);
	if (parts[2].length !== 4 || month < 1 || month > 12 || day < 1 || day > 31) return NaN;
	return Date.UTC(year, month - 1, day);
}

/** True when an ISO date has a `±hh:mm` or `±hhmm` offset after its time. */
function hasOffset(date: string): boolean {
	const t = date.indexOf('T');
	if (t < 0) return false;
	const time = date.slice(t + 1);
	return time.includes('+') || time.includes('-');
}

export default defineNode<CalendarParameters>({
	type: 'n8n-nodes-base.googleCalendar',
	version: 1.3,
	supports: {
		resource: 'event',
		operation: { event: 'create' },
		operations: {
			'event.getAll': [
				'authentication="oAuth2"',
				'calendar',
				'returnAll',
				'limit',
				'timeMin',
				'timeMax',
				'options',
				'options.fields',
				'options.iCalUID',
				'options.maxAttendees',
				'options.orderBy',
				'options.query',
				'options.recurringEventHandling',
				'options.showDeleted',
				'options.showHiddenInvitations',
				'options.singleEvents',
				'options.timeMax',
				'options.timeMin',
				'options.timeZone',
				'options.updatedMin',
			],
		},
	},
	async run(ctx, parameters, items, credential) {
		const resource = parameters.resource ?? 'event';
		const operation = parameters.operation ?? 'create';
		if (resource !== 'event' || operation !== 'getAll') {
			throw new Error(`Google Calendar: ${resource}.${operation} is not in the compiled library`);
		}
		const headers = { 'Content-Type': 'application/json' };
		const out: Item[] = [];
		for (const _item of items ?? [{}]) {
			const calendarId = encodeOnce(locatorValue(parameters.calendar));
			const options = parameters.options ?? {};
			const tz = locatorValue(options.timeZone);
			const qs: Record<string, unknown> = {};
			const now = Date.now();
			// The default applies only to a missing parameter. An expression that gives null
			// or '' sends no bound, as v1 does (`if (timeMin)`).
			const timeMin =
				parameters.timeMin === undefined ? new Date(now).toISOString() : parameters.timeMin;
			const timeMax =
				parameters.timeMax === undefined
					? new Date(now + WEEK_MS).toISOString()
					: parameters.timeMax;
			if (timeMin) qs.timeMin = toUtc(String(timeMin));
			if (timeMax) qs.timeMax = toUtc(String(timeMax));
			const handling = options.recurringEventHandling;
			if (!handling || handling === 'expand') qs.singleEvents = true;
			if (options.iCalUID) qs.iCalUID = options.iCalUID;
			if (options.maxAttendees) qs.maxAttendees = options.maxAttendees;
			if (options.orderBy) qs.orderBy = options.orderBy;
			if (options.query) qs.q = options.query;
			if (options.showDeleted) qs.showDeleted = options.showDeleted;
			if (options.showHiddenInvitations) qs.showHiddenInvitations = options.showHiddenInvitations;
			if (options.singleEvents) qs.singleEvents = options.singleEvents;
			if (options.timeMax) qs.timeMax = toUtc(String(options.timeMax));
			if (options.timeMin) qs.timeMin = toUtc(String(options.timeMin));
			if (tz) qs.timeZone = tz;
			if (options.updatedMin) qs.updatedMin = toUtc(String(options.updatedMin));
			if (options.fields) qs.fields = options.fields;
			const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
			const get = async (target: string, query: Record<string, unknown>) => {
				const response = await ctx.http<{ items?: CalendarEvent[]; nextPageToken?: string }>({
					method: 'GET',
					url: target,
					headers,
					qs: query,
					body: undefined,
					credential,
				});
				if (response.status >= 400) {
					throw new Error(`Google Calendar: HTTP status ${response.status}`);
				}
				return response.body;
			};
			let events: CalendarEvent[] = [];
			if (parameters.returnAll === true) {
				// googleApiRequestAllItems: pages of 100 until no page token is left.
				qs.maxResults = 100;
				for (let page = 0; page < 10000; page++) {
					const data = await get(url, qs);
					events = events.concat(data.items ?? []);
					if (data.nextPageToken === undefined || data.nextPageToken === '') break;
					qs.pageToken = data.nextPageToken;
				}
			} else {
				qs.maxResults = parameters.limit ?? 50;
				events = (await get(url, qs)).items ?? [];
			}
			if (handling === 'next') {
				const next: CalendarEvent[] = [];
				for (const event of events) {
					if (event.recurrence) {
						const instances = await get(`${url}/${String(event.id)}/instances`, {
							timeMin: new Date(Date.now()).toISOString(),
							maxResults: 1,
						});
						next.push((instances.items ?? [])[0] ?? event);
						continue;
					}
					next.push(event);
				}
				events = next;
			} else if (handling === 'first') {
				const min = typeof qs.timeMin === 'string' ? qs.timeMin : '';
				const max = typeof qs.timeMax === 'string' ? qs.timeMax : '';
				events = events.filter((event) => {
					const created = typeof event.created === 'string' ? event.created : '';
					if (min && event.recurrence && created && created < min) return false;
					if (max && event.recurrence && created && created > max) return false;
					return true;
				});
			}
			for (const event of events) out.push(event);
		}
		return out;
	},
});
