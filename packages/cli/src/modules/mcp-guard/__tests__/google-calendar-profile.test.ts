import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import {
	enrichCalendar,
	GOOGLE_CALENDAR_PROFILE,
	withPlaceholderOrganizer,
} from '../google-calendar-profile';
import { HTTP_PROFILES } from '../http-profiles';
import { HttpGuardRouter } from '../http-router';
import { looksLikeId, toToolCall } from '../http-tool-caller';
import type { McpCaller } from '../mcp-upstream';
import type { CapturedRequest } from '../network';
import { isReadShaped } from '../request-classifier';
import { isTokenExchange, loadVendorKnowledge, vendorForRequest } from '../vendor-knowledge';

const HOST = 'www.googleapis.com';
const CAL = '/calendar/v3/calendars/primary';
const EVENT = '7ob7t1p7pk0b4cuk3q8hbi4a2k';
const SHORT = 'standup';

const req = (method: string, path: string, body?: unknown, host = HOST) =>
	({
		method,
		url: new URL(`https://${host}${path}`),
		headers: { authorization: 'Bearer real-token-123' },
		body: body === undefined ? undefined : Buffer.from(JSON.stringify(body)),
	}) satisfies CapturedRequest;

describe('the Google Calendar vendor file', () => {
	const vendor = loadVendorKnowledge('googlecalendar');

	it('names www.googleapis.com, the calendar prefix and the freeBusy read', () => {
		expect(vendor.name).toBe('googlecalendar');
		expect(vendor.hosts).toEqual(['www.googleapis.com']);
		expect(vendor.pathPrefixes).toEqual(['/calendar/v3']);
		expect(vendor.readPaths.map(String)).toEqual([String(/^\/calendar\/v3\/freeBusy$/)]);
		expect(vendor.instructions).toContain('native.google_calendar');
	});

	it('is chosen for a Calendar request and not for Gmail or another Google API', () => {
		expect(vendorForRequest(HOST, `${CAL}/events`)?.name).toBe('googlecalendar');
		expect(vendorForRequest(HOST, '/calendar/v3')?.name).toBe('googlecalendar');
		expect(vendorForRequest(HOST, '/calendar/v3x/events')).toBeUndefined();
		expect(vendorForRequest(HOST, '/gmail/v1/users/me/labels')?.name).toBe('gmail');
		expect(vendorForRequest(HOST, '/oauth2/v3/userinfo')).toBeUndefined();
		expect(vendorForRequest('calendar.googleapis.com', `${CAL}/events`)).toBeUndefined();
	});

	it('keeps the token exchange working with the other vendors on oauth2.googleapis.com', () => {
		const call = (method: string, path: string) => ({
			method,
			url: new URL(`https://oauth2.googleapis.com${path}`),
		});

		expect(isTokenExchange(call('POST', '/token'))).toBe(true);
		expect(isTokenExchange(call('POST', '/revoke'))).toBe(false);
		expect(vendorForRequest('oauth2.googleapis.com', '/token')).toBeUndefined();
		expect(vendor.passthroughHosts).toEqual(loadVendorKnowledge('gmail').passthroughHosts);
	});

	it('has one profile with its own file name and the Google credential', () => {
		const names = HTTP_PROFILES.map((profile) => profile.name);

		expect(names).toEqual([...new Set(names)]);
		expect(names).toContain('googlecalendar');
		expect(GOOGLE_CALENDAR_PROFILE.credentialKind).toBe('google_oauth');
		expect(GOOGLE_CALENDAR_PROFILE.credentialField).toBe('oauthTokenData.access_token');
		expect(GOOGLE_CALENDAR_PROFILE.gymService).toBe('google-calendar');
	});
});

describe('routing of every operation of the Calendar node', () => {
	const vendor = loadVendorKnowledge('googlecalendar');
	const read = (r: ReturnType<typeof req>) => isReadShaped(r, vendor.readPaths);

	it.each([
		['Calendar > Availability (freeBusy)', 'POST', '/calendar/v3/freeBusy'],
		['Event > Get', 'GET', `${CAL}/events/${EVENT}`],
		['Event > Get Many', 'GET', `${CAL}/events?timeMin=2026-01-01T00%3A00%3A00Z`],
		['Event > Get Many (instances)', 'GET', `${CAL}/events/${EVENT}/instances`],
		[
			'the calendar of an event (timezone)',
			'GET',
			'/calendar/v3/users/me/calendarList/user%40example.com',
		],
		['the colors', 'GET', '/calendar/v3/colors'],
		['Event > Get with a short id', 'GET', `${CAL}/events/${SHORT}`],
	])('treats %s as a read', (_name, method, path) => {
		expect(read(req(method, path, method === 'POST' ? { items: [] } : undefined))).toBe(true);
	});

	it.each([
		['Event > Create', 'POST', `${CAL}/events`],
		['Event > Create (quick add)', 'POST', `${CAL}/events/quickAdd`],
		['Event > Update', 'PATCH', `${CAL}/events/${EVENT}`],
		['Event > Update (put)', 'PUT', `${CAL}/events/${EVENT}`],
		['Event > Delete', 'DELETE', `${CAL}/events/${EVENT}`],
		['Event > Move', 'POST', `${CAL}/events/${EVENT}/move`],
		['Event > Import', 'POST', `${CAL}/events/import`],
		['a calendar create', 'POST', '/calendar/v3/calendars'],
		['a calendar delete', 'DELETE', '/calendar/v3/calendars/abc'],
		['clear the primary calendar', 'POST', `${CAL}/clear`],
		['an acl insert', 'POST', `${CAL}/acl`],
		['freeBusy with a longer path', 'POST', '/calendar/v3/freeBusy/extra'],
		['freeBusy in another case', 'POST', '/calendar/v3/freebusy'],
		['a watch', 'POST', `${CAL}/events/watch`],
	])('treats %s as a write', (_name, method, path) => {
		const request = req(method, path, {});
		expect(read(request)).toBe(false);
		expect(toToolCall(request, false).name.startsWith('write_')).toBe(true);
	});

	it('does not see an event id without a digit as an id, so the profile does not rely on looksLikeId', () => {
		expect(looksLikeId(EVENT)).toBe(true);
		expect(looksLikeId(SHORT)).toBe(false);
		expect(looksLikeId('abcdefghijkl')).toBe(false);
		// The real ids need a lookup anyway: the profile reads the place in the path.
		const lookups = GOOGLE_CALENDAR_PROFILE.lookups!;
		expect(
			lookups('write_patch_calendar_calendars_events_standup', {
				method: 'PATCH',
				path: `${CAL}/events/${SHORT}`,
			}),
		).toHaveLength(1);
		expect(
			GOOGLE_CALENDAR_PROFILE.hydrateWrite!(
				{ method: 'PATCH', path: `${CAL}/events/${SHORT}` },
				new Set(),
			),
		).toBe(true);
	});
});

describe('enrichCalendar', () => {
	it('adds flat time and attendee fields to an event', () => {
		const out = enrichCalendar({
			id: EVENT,
			start: { dateTime: '2026-11-20T10:00:00+01:00' },
			end: { dateTime: '2026-11-20T11:00:00+01:00' },
			attendees: [{ email: 'a@x.test' }, { displayName: 'no mail' }, 'x'],
		}) as Record<string, unknown>;

		expect(out).toMatchObject({
			startAt: '2026-11-20T10:00:00+01:00',
			endAt: '2026-11-20T11:00:00+01:00',
			isAllDay: false,
			attendeeEmails: ['a@x.test'],
		});
	});

	it('marks an all-day event and enriches the items of a list', () => {
		const out = enrichCalendar({
			items: [
				{ id: 'a', start: { date: '2026-11-21' }, end: { date: '2026-11-22' } },
				'x',
				{ id: 'b' },
			],
		}) as { items: Array<Record<string, unknown>> };

		expect(out.items[0]).toMatchObject({
			startAt: '2026-11-21',
			isAllDay: true,
			attendeeEmails: [],
		});
		expect(out.items[1]).toBe('x');
		expect(out.items[2]).toEqual({ id: 'b' });
	});

	it('keeps an event with only an end, and an event with no time', () => {
		const onlyEnd = enrichCalendar({ end: { date: '2026-11-22' } }) as Record<string, unknown>;

		expect(onlyEnd.endAt).toBe('2026-11-22');
		expect(onlyEnd).not.toHaveProperty('startAt');
		expect(enrichCalendar({ id: 'c', start: 'bad' })).toEqual({ id: 'c', start: 'bad' });
	});

	it('flattens the busy intervals of a freeBusy answer', () => {
		const out = enrichCalendar({
			calendars: {
				'a@x.test': { busy: [{ start: 's1', end: 'e1' }, 'x'] },
				primary: { busy: [{ start: 's2', end: 'e2' }] },
				other: 5,
			},
		}) as { busyIntervals: unknown[] };

		expect(out.busyIntervals).toEqual([
			{ calendar: 'a@x.test', start: 's1', end: 'e1' },
			{ calendar: 'primary', start: 's2', end: 'e2' },
		]);
	});

	it('leaves other answers as they are', () => {
		expect(enrichCalendar(null)).toBeNull();
		expect(enrichCalendar([1])).toEqual([1]);
		expect(enrichCalendar({ id: 'cal', summary: 'x' })).toEqual({ id: 'cal', summary: 'x' });
	});
});

describe('Google Calendar lookups', () => {
	const lookups = GOOGLE_CALENDAR_PROFILE.lookups!;

	it('looks up nothing for the primary calendar, a list or a create', () => {
		expect(lookups('read_list_events', { method: 'GET', path: `${CAL}/events` })).toEqual([]);
		expect(lookups('write_post_events', { method: 'POST', path: `${CAL}/events` })).toEqual([]);
		expect(
			lookups('write_post_events', { method: 'POST', path: `${CAL}/events/quickAdd` }),
		).toEqual([]);
		expect(lookups('read_get_x', { method: 'GET', path: '/calendar/v3/colors' })).toEqual([]);
		expect(
			lookups('write_post_calendars', { method: 'POST', path: '/calendar/v3/calendars' }),
		).toEqual([]);
	});

	it('looks up a calendar that is not primary, with its id encoded', () => {
		const found = lookups('read_list_events', {
			method: 'GET',
			path: '/calendar/v3/calendars/team%40group.calendar.google.com/events',
		});

		expect(found).toHaveLength(1);
		expect(found[0].tool.startsWith('read_')).toBe(true);
		expect(found[0].args.path).toBe('/calendar/v3/calendars/team%40group.calendar.google.com');
	});

	it('looks up the event of a write, also with an action and a decoded id', () => {
		const found = lookups('write_post_events_move', {
			method: 'POST',
			path: `/calendar/v3/calendars/me%40x.test/events/${EVENT}/move`,
		});

		expect(found.map((f) => f.args.path)).toEqual([
			'/calendar/v3/calendars/me%40x.test',
			`/calendar/v3/calendars/me%40x.test/events/${EVENT}`,
		]);
		expect(
			lookups('write_delete_events', { method: 'DELETE', path: `${CAL}/events/${EVENT}` }),
		).toHaveLength(1);
		expect(
			lookups('write_delete_events', { method: 'DELETE', path: `${CAL}/events/%E0%A4%A` }),
		).toHaveLength(1);
	});

	it('looks up the calendars of a freeBusy request that are not primary, at most four', () => {
		const items = [
			{ id: 'primary' },
			{ id: 'a@x.test' },
			{ id: 'a@x.test' },
			{ id: 'b' },
			{ id: 'c' },
			{ id: 'd' },
			{ id: 'e' },
			5,
		];
		const found = lookups('read_post_calendar_freeBusy', {
			method: 'POST',
			path: '/calendar/v3/freeBusy',
			body: { items },
		});

		expect(found.map((f) => f.args.path)).toEqual([
			'/calendar/v3/calendars/a%40x.test',
			'/calendar/v3/calendars/b',
			'/calendar/v3/calendars/c',
			'/calendar/v3/calendars/d',
		]);
		expect(
			lookups('read_post_calendar_freeBusy', { method: 'POST', path: '/calendar/v3/freeBusy' }),
		).toEqual([]);
	});

	it('does not copy the colors or the primary entry of the calendar list', () => {
		const hydrate = GOOGLE_CALENDAR_PROFILE.hydrateRead!;
		const args = (path: string) => ({ method: 'GET', path });

		expect(hydrate(args('/calendar/v3/colors'), {})).toBe(false);
		expect(hydrate(args('/calendar/v3/users/me/calendarList/primary'), {})).toBe(false);
		expect(hydrate(args('/calendar/v3/users/me/calendarList/a%40x.test'), {})).toBe(true);
		expect(hydrate(args(`${CAL}/events`), {})).toBe(true);
	});

	it('hydrates a write only for a calendar or an event that the gym did not make', () => {
		const hydrate = GOOGLE_CALENDAR_PROFILE.hydrateWrite!;
		const patch = { method: 'PATCH', path: `${CAL}/events/${EVENT}` };
		const secondary = { method: 'POST', path: '/calendar/v3/calendars/team%40x.test/events' };

		expect(hydrate(patch, new Set())).toBe(true);
		expect(hydrate(patch, new Set([EVENT]))).toBe(false);
		expect(hydrate({ method: 'POST', path: `${CAL}/events` }, new Set())).toBe(false);
		expect(hydrate(secondary, new Set())).toBe(true);
		expect(hydrate(secondary, new Set(['team@x.test']))).toBe(false);
		expect(hydrate({ method: 'POST', path: '/calendar/v3/calendars' }, new Set())).toBe(false);
	});
});

describe('withPlaceholderOrganizer', () => {
	it('removes the owner, the organizer and the sharing list under both names of the service', () => {
		const out = withPlaceholderOrganizer({
			world_version: 1,
			native: {
				google_calendar: {
					calendars: [
						{ ref: 'calendar:t', id: 'x', owner: 'person:a', shared_with: [], summary: 'T' },
						5,
					],
					events: [{ ref: 'event:e', id: EVENT, organizer: 'a@x.test', owner: 'b', summary: 'E' }],
				},
				'google-calendar': { events: [{ organizer: 'x', summary: 'F' }] },
				other: { keep: true },
			},
		});

		expect(out.native).toEqual({
			google_calendar: {
				calendars: [{ ref: 'calendar:t', id: 'x', summary: 'T' }, 5],
				events: [{ ref: 'event:e', id: EVENT, summary: 'E' }],
			},
			'google-calendar': { events: [{ summary: 'F' }] },
			other: { keep: true },
		});
	});

	it('leaves an overlay without the Calendar block, or without native data, as it is', () => {
		const plain = { world_version: 1 };

		expect(withPlaceholderOrganizer(plain)).toBe(plain);
		expect(withPlaceholderOrganizer({ native: { google_calendar: { events: 'x' } } })).toEqual({
			native: { google_calendar: { events: 'x' } },
		});
		expect(withPlaceholderOrganizer({ native: { google_calendar: 5 } })).toEqual({
			native: { google_calendar: 5 },
		});
	});
});

describe('the guard on a Calendar request', () => {
	const result = (body: unknown, status = 200): CallToolResult => ({
		isError: status >= 400,
		content: [{ type: 'text', text: JSON.stringify(body) }],
		_meta: { status, contentType: 'application/json' },
	});

	function setup() {
		const upstream = {
			listTools: vi.fn(async () => []),
			callTool: vi.fn(async (..._a: unknown[]) => result({})),
		};
		const gym = {
			listTools: vi.fn(async () => []),
			callTool: vi.fn(async (..._a: unknown[]) => result({})),
		};
		const hydrator = {
			hydrate: vi.fn(async (..._a: unknown[]) => {}),
			hydrateWrite: vi.fn(async (..._a: unknown[]) => {}),
			noteWrite: vi.fn(),
		};
		const router = new HttpGuardRouter({
			upstream: upstream as unknown as McpCaller,
			gym: gym as unknown as McpCaller,
			hydrator,
			profile: GOOGLE_CALENDAR_PROFILE,
		});
		return { router, upstream, gym, hydrator };
	}

	it.each([
		['POST', `${CAL}/events`],
		['POST', `${CAL}/events/quickAdd`],
		['PATCH', `${CAL}/events/${EVENT}`],
		['DELETE', `${CAL}/events/${EVENT}`],
		['POST', `${CAL}/events/${EVENT}/move`],
	])('sends %s %s only to the gym', async (method, path) => {
		const { router, upstream, gym } = setup();

		const res = await router.handle(
			req(method, path, { summary: 'x', attendees: [{ email: 'a@x.test' }] }),
		);

		expect(res.status).toBe(200);
		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('reads the real service for freeBusy with its body, then answers from the gym', async () => {
		const { router, upstream, gym, hydrator } = setup();
		const body = { timeMin: 'a', timeMax: 'b', items: [{ id: 'primary' }] };

		await router.handle(req('POST', '/calendar/v3/freeBusy', body));

		expect(upstream.callTool).toHaveBeenCalledTimes(1);
		expect(upstream.callTool.mock.calls[0][0]).toBe('read_post_calendar_freeBusy');
		expect(upstream.callTool.mock.calls[0][1]).toMatchObject({ method: 'POST', body });
		expect(hydrator.hydrate).toHaveBeenCalledTimes(1);
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('does not read the real service for a freeBusy-like path that is not listed', async () => {
		const { router, upstream } = setup();

		await router.handle(req('POST', '/calendar/v3/freeBusy/other', {}));

		expect(upstream.callTool).not.toHaveBeenCalled();
	});

	it('reads an event of the real calendar first and hydrates a write on it', async () => {
		const { router, upstream, hydrator } = setup();

		await router.handle(req('GET', `${CAL}/events/${EVENT}`));
		await router.handle(req('PATCH', `${CAL}/events/${SHORT}`, { summary: 'x' }));

		expect(upstream.callTool).toHaveBeenCalledTimes(1);
		expect(hydrator.hydrate).toHaveBeenCalledTimes(1);
		expect(hydrator.hydrateWrite).toHaveBeenCalledTimes(1);
	});

	it('answers a read of an event that the gym made from the gym alone', async () => {
		const { router, upstream, gym, hydrator } = setup();
		gym.callTool.mockResolvedValueOnce(result({ id: EVENT }));
		await router.handle(req('POST', `${CAL}/events`, { summary: 'x' }));

		await router.handle(req('GET', `${CAL}/events/${EVENT}`));
		await router.handle(req('PATCH', `${CAL}/events/${EVENT}`, {}));

		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(hydrator.hydrate).not.toHaveBeenCalled();
		expect(hydrator.hydrateWrite).not.toHaveBeenCalled();
	});

	it('does not put the token, the query or the body in a log line or in a call to the gym', async () => {
		const lines: string[] = [];
		const sink = (line: string) => lines.push(line);
		Container.set(Logger, { info: sink, warn: sink, error: sink } as unknown as Logger);
		const { router, gym, hydrator } = setup();

		await router.handle(req('GET', `${CAL}/events?q=secretQuery`));
		await router.handle(req('POST', `${CAL}/events`, { summary: 'secretSummary' }));

		const text = lines.join('\n');
		expect(text).toContain('mcp-guard http GET www.googleapis.com');
		expect(text).not.toContain('real-token-123');
		expect(text).not.toContain('secretQuery');
		expect(text).not.toContain('secretSummary');
		const sent = JSON.stringify([gym.callTool.mock.calls, hydrator.hydrate.mock.calls]);
		expect(sent).not.toContain('real-token-123');
	});
});
