import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import {
	enrichOutlook,
	htmlToText,
	HTTP_PROFILES,
	OUTLOOK_PROFILE,
	withOutlookMailbox,
} from '../http-profiles';
import { HttpGuardRouter } from '../http-router';
import { looksLikeId, toToolCall } from '../http-tool-caller';
import type { McpCaller } from '../mcp-upstream';
import type { CapturedRequest } from '../network';
import { isReadShaped } from '../request-classifier';
import { isTokenExchange, loadVendorKnowledge, vendorForRequest } from '../vendor-knowledge';

const GRAPH = 'graph.microsoft.com';
const TOKEN = 'eyJ0eXAi-secret-token';
// Real-looking Graph ids: long, with "=", "-" and "_".
const MSG =
	'AAMkADU3MGUwMzQ4LTkyN2EtNGI5NS1hMzQwLWEzN2YyODQ4ZGFlYQBGAAAAAACoEtPrXlmzT5uM3Uq0BxsGBwDvh7LrB1FcT5MYZ6wFp8XUAAAAAAEMAADvh7LrB1FcT5MYZ6wFp8XUAAAAABvAAA=';
const FOLDER =
	'AQMkADU3MGUwMzQ4LTkyN2EtNGI5NS1hMzQwAC4AAAOoEtPrXlmzT5uM3Uq0BxsBAO-h7LrB1FcT5MYZ6wFp8XUAAAIBDAAAAA==';
const EVENT = 'AAMkADU3_GUwMzQ4-TkyN2EtNGI5NS1hMzQwLWEzN2YyODQ4ZGFlYQBGAAAAAAB2NQ_wIEFC-TQ7=';
const ME = '/v1.0/me';

const result = (body: unknown, status = 200): CallToolResult => ({
	isError: status >= 400,
	content: [{ type: 'text', text: JSON.stringify(body) }],
	_meta: { status, contentType: 'application/json' },
});

const request = (method: string, path: string, body?: unknown, host = GRAPH): CapturedRequest => ({
	method,
	url: new URL(`https://${host}${path}`),
	headers: { authorization: `Bearer ${TOKEN}` },
	body: body === undefined ? undefined : Buffer.from(JSON.stringify(body)),
});

// Every call of the Outlook node (v2), from its transport: method and path of each operation.
const READS: Array<[string, string]> = [
	['message get', `${ME}/messages/${MSG}`],
	['message getAll', `${ME}/messages`],
	['message attachment get', `${ME}/messages/${MSG}/attachments/${MSG}`],
	['message attachment getAll', `${ME}/messages/${MSG}/attachments`],
	['message attachment download', `${ME}/messages/${MSG}/attachments/${MSG}/$value`],
	['message mime', `${ME}/messages/${MSG}/$value`],
	['draft get', `${ME}/messages/${MSG}`],
	['folder get', `${ME}/mailFolders/${FOLDER}`],
	['folder getAll', `${ME}/mailFolders`],
	['folder children', `${ME}/mailFolders/${FOLDER}/childFolders`],
	['folder message getAll', `${ME}/mailFolders/${FOLDER}/messages`],
	['folder message of a well-known folder', `${ME}/mailFolders/inbox/messages`],
	['event get', `${ME}/calendar/events/${EVENT}`],
	['event getAll', `${ME}/calendars/${FOLDER}/events`],
	['calendar get', `${ME}/calendars/${FOLDER}`],
	['calendar getAll', `${ME}/calendars`],
	['calendar groups', `${ME}/calendarGroups`],
	['contact get', `${ME}/contacts/${MSG}`],
	['contact getAll', `${ME}/contacts`],
	['categories', `${ME}/outlook/masterCategories`],
	['shared mailbox', '/v1.0/users/bob@contoso.com/messages'],
];
const WRITES: Array<[string, string, string]> = [
	['message send', 'POST', `${ME}/sendMail`],
	['message send and wait', 'POST', `${ME}/sendMail`],
	['message move', 'POST', `${ME}/messages/${MSG}/move`],
	['message update', 'PATCH', `${ME}/messages/${MSG}`],
	['message delete', 'DELETE', `${ME}/messages/${MSG}`],
	['message reply', 'POST', `${ME}/messages/${MSG}/createReply`],
	['message reply all', 'POST', `${ME}/messages/${MSG}/createReplyAll`],
	['message reply send', 'POST', `${ME}/messages/${MSG}/send`],
	['draft create', 'POST', `${ME}/messages`],
	['draft update', 'PATCH', `${ME}/messages/${MSG}`],
	['draft send', 'POST', `${ME}/messages/${MSG}/send`],
	['draft delete', 'DELETE', `${ME}/messages/${MSG}`],
	['attachment add', 'POST', `${ME}/messages/${MSG}/attachments`],
	['attachment upload session', 'POST', `${ME}/messages/${MSG}/attachments/createUploadSession`],
	['folder create', 'POST', `${ME}/mailFolders`],
	['folder update', 'PATCH', `${ME}/mailFolders/${FOLDER}`],
	['folder delete', 'DELETE', `${ME}/mailFolders/${FOLDER}`],
	['event create', 'POST', `${ME}/calendar/events`],
	['event update', 'PATCH', `${ME}/calendar/events/${EVENT}`],
	['event delete', 'DELETE', `${ME}/calendar/events/${EVENT}`],
	['calendar create', 'POST', `${ME}/calendars`],
	['calendar update', 'PATCH', `${ME}/calendars/${FOLDER}`],
	['calendar delete', 'DELETE', `${ME}/calendars/${FOLDER}`],
	['contact create', 'POST', `${ME}/contacts`],
	['contact update', 'PATCH', `${ME}/contacts/${MSG}`],
	['contact delete', 'DELETE', `${ME}/contacts/${MSG}`],
	['batch', 'POST', '/v1.0/$batch'],
	['batch of a mailbox', 'POST', `${ME}/$batch`],
	['a PUT', 'PUT', `${ME}/messages/${MSG}`],
	['an action that only reads', 'POST', `${ME}/findMeetingTimes`],
	['a search that only reads', 'POST', '/v1.0/search/query'],
];

function setup() {
	const upstream = {
		listTools: vi.fn(async () => []),
		callTool: vi.fn(async (..._a: unknown[]) => result({ value: [] })),
	};
	const gym = {
		listTools: vi.fn(async () => []),
		callTool: vi.fn(async (..._a: unknown[]) => result({ id: MSG, parentFolderId: FOLDER })),
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
		profile: OUTLOOK_PROFILE,
	});
	return { router, upstream, gym, hydrator };
}

describe('the Outlook vendor file', () => {
	const vendor = loadVendorKnowledge('outlook');

	it('loads and names the Graph host, the prefix and the sign-in host', () => {
		expect(vendor.name).toBe('outlook');
		expect(vendor.hosts).toEqual([GRAPH]);
		expect(vendor.pathPrefixes).toEqual(['/v1.0']);
		expect(vendor.passthroughHosts).toEqual(['login.microsoftonline.com']);
		expect(vendor.readPaths).toEqual([]);
		expect(vendor.instructions).toContain('native.outlook');
	});

	it('is chosen for Graph v1.0 and not for beta, another version or another host', () => {
		expect(vendorForRequest(GRAPH, '/v1.0/me/messages')?.name).toBe('outlook');
		expect(vendorForRequest(GRAPH, '/v1.0/$batch')?.name).toBe('outlook');
		expect(vendorForRequest(GRAPH, '/beta/me/messages')).toBeUndefined();
		expect(vendorForRequest('graph.microsoft.us', '/v1.0/me/messages')).toBeUndefined();
		expect(
			vendorForRequest('login.microsoftonline.com', '/common/oauth2/v2.0/token'),
		).toBeUndefined();
	});

	it('has a profile with the default ports of the table', () => {
		expect(HTTP_PROFILES).toContain(OUTLOOK_PROFILE);
	});
});

describe('the Microsoft token path', () => {
	const call = (method: string, path: string, host = 'login.microsoftonline.com') => ({
		method,
		url: new URL(`https://${host}${path}`),
	});

	it.each([
		'/common/oauth2/v2.0/token',
		'/organizations/oauth2/v2.0/token',
		'/72f988bf-86f1-41af-91ab-2d7cd011db47/oauth2/v2.0/token',
		'/contoso.onmicrosoft.com/oauth2/v2.0/token',
		'/oauth2/token',
	])('passes a POST to %s through', (path) => {
		expect(isTokenExchange(call('POST', path))).toBe(true);
	});

	it.each([
		['POST', '/common/oauth2/v2.0/authorize'],
		['POST', '/common/oauth2/v2.0/logout'],
		['POST', '/common/oauth2/v2.0/token/extra'],
		['POST', '/common/oauth2/v2.0/devicecode'],
		['GET', '/common/oauth2/v2.0/token'],
	])('does not pass %s %s through', (method, path) => {
		expect(isTokenExchange(call(method, path))).toBe(false);
	});

	it('does not pass a token path on the Graph host through', () => {
		expect(isTokenExchange(call('POST', '/v1.0/token', GRAPH))).toBe(false);
	});
});

describe('Outlook routing for every operation', () => {
	const { readPaths } = loadVendorKnowledge('outlook');

	it.each(READS)('%s is read-shaped', (_label, path) => {
		expect(isReadShaped(request('GET', path), readPaths)).toBe(true);
	});

	it.each(WRITES)('%s is not read-shaped', (_label, method, path) => {
		expect(isReadShaped(request(method, path, { x: 1 }), readPaths)).toBe(false);
	});

	it.each(READS)('%s reads the real service, then the gym answers', async (_label, path) => {
		const { router, upstream, gym } = setup();

		await router.handle(request('GET', path));

		expect(upstream.callTool).toHaveBeenCalledTimes(1);
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it.each(WRITES)('%s goes only to the gym', async (_label, method, path) => {
		const { router, upstream, gym } = setup();

		await router.handle(request(method, path, method === 'DELETE' ? undefined : { x: 1 }));

		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('names a $batch call a write', () => {
		const call = toToolCall(request('POST', '/v1.0/$batch', { requests: [] }), false);

		expect(call.name).toBe('write_post_$batch');
	});

	it('refuses a request on another Graph host and calls nothing', async () => {
		const { router, upstream, gym } = setup();

		const res = await router.handle(
			request('GET', `${ME}/messages`, undefined, 'graph.microsoft.us'),
		);

		expect(res.status).toBe(403);
		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).not.toHaveBeenCalled();
	});
});

describe('Graph ids', () => {
	it.each([MSG, FOLDER, EVENT])('looksLikeId accepts %s', (id) => {
		expect(looksLikeId(id)).toBe(true);
	});

	it.each([
		'me',
		'users',
		'inbox',
		'sentitems',
		'messages',
		'mailFolders',
		'$value',
		'move',
		'v1.0',
	])('looksLikeId refuses the word %s', (word) => {
		expect(looksLikeId(word)).toBe(false);
	});

	it('names the calls with ids by their resources', () => {
		const name = (method: string, path: string) =>
			toToolCall(request(method, path, method === 'POST' ? {} : undefined), method === 'GET').name;

		expect(name('GET', `${ME}/messages/${MSG}`)).toBe('read_get_messages');
		expect(name('GET', `${ME}/messages`)).toBe('read_list_messages');
		expect(name('POST', `${ME}/messages/${MSG}/move`)).toBe('write_post_messages_move');
		expect(name('GET', `${ME}/mailFolders/${FOLDER}/messages`)).toBe(
			'read_list_mailFolders_messages',
		);
		expect(name('DELETE', `${ME}/calendar/events/${EVENT}`)).toBe('write_delete_calendar_events');
		expect(name('GET', `/v1.0/users/bob@contoso.com/messages/${MSG}`)).toBe('read_get_messages');
	});

	it('keeps the id as it is in the args of the call', () => {
		const call = toToolCall(request('GET', `${ME}/messages/${MSG}`), true);

		expect(call.args.path).toBe(`${ME}/messages/${MSG}`);
		expect(call.args.path.endsWith('=')).toBe(true);
	});

	it('tracks an id of the gym and reads it only in the gym', async () => {
		const { router, upstream, gym } = setup();
		const made = 'AAMkGym-made_id=0123456789012345678901234567890123456789==';
		gym.callTool.mockResolvedValueOnce(result({ id: made, parentFolderId: FOLDER }));
		await router.handle(request('POST', `${ME}/messages`, { subject: 'x' }));

		await router.handle(request('GET', `${ME}/messages/${made}`));
		await router.handle(request('GET', `${ME}/mailFolders/${FOLDER}/messages`));

		expect(upstream.callTool).not.toHaveBeenCalled();
	});

	it('answers a read of the gym id that the path encodes from the gym only', async () => {
		const { router, upstream, gym } = setup();
		const made = 'AAMkGym+made/id=0123456789012345678901234567890123456789==';
		gym.callTool.mockResolvedValueOnce(result({ id: made }));
		await router.handle(request('POST', `${ME}/messages`, {}));

		await router.handle(request('GET', `${ME}/messages/${encodeURIComponent(made)}`));

		expect(upstream.callTool).not.toHaveBeenCalled();
	});
});

describe('htmlToText', () => {
	it('removes tags, styles and scripts, and decodes entities', () => {
		const html =
			'<html><head><title>t</title><style>p{color:red}</style></head><body><p>Hi &amp; hello&nbsp;Bob</p><div>Line<br>two &#233; &#x41; &lt;b&gt; &bogus;</div><script>x()</script></body></html>';

		expect(htmlToText(html)).toBe('Hi & hello Bob\nLine\ntwo é A <b> &bogus;');
	});

	it('keeps a number that is no code point as it is', () => {
		expect(htmlToText('a &#0; b &#99999999; c')).toBe('a &#0; b &#99999999; c');
	});
});

describe('enrichOutlook', () => {
	const message = (over: Record<string, unknown> = {}) => ({
		id: MSG,
		subject: 'Hello',
		body: { contentType: 'html', content: '<p>Hi <b>Ann</b></p>' },
		from: { emailAddress: { name: 'Bob', address: 'bob@contoso.com' } },
		toRecipients: [{ emailAddress: { address: 'ann@contoso.com' } }, { emailAddress: {} }],
		ccRecipients: [],
		receivedDateTime: '2026-11-01T10:00:00Z',
		...over,
	});

	it('adds the plain text, the addresses and the date to a message', () => {
		const out = enrichOutlook(message()) as Record<string, unknown>;

		expect(out).toMatchObject({
			id: MSG,
			decodedBody: 'Hi Ann',
			fromAddress: 'bob@contoso.com',
			toAddresses: ['ann@contoso.com'],
			ccAddresses: [],
			isoDate: '2026-11-01T10:00:00Z',
		});
		expect((out.body as Record<string, unknown>).content).toBe('<p>Hi <b>Ann</b></p>');
	});

	it('keeps the text of a text body as it is, and cuts a very long body', () => {
		const text = enrichOutlook(
			message({ body: { contentType: 'text', content: '<not html>' } }),
		) as {
			decodedBody: string;
		};
		const long = enrichOutlook(
			message({ body: { contentType: 'text', content: 'x'.repeat(30_000) } }),
		) as {
			decodedBody: string;
		};

		expect(text.decodedBody).toBe('<not html>');
		expect(long.decodedBody).toHaveLength(20_000);
	});

	it('enriches every message of a list and of a nested array', () => {
		const out = enrichOutlook({
			value: [message(), message({ id: 'two' })],
			'@odata.nextLink': 'n',
		});
		const list = enrichOutlook([message()]) as Array<Record<string, unknown>>;

		expect(
			(out as { value: Array<Record<string, unknown>> }).value.map((m) => m.fromAddress),
		).toEqual(['bob@contoso.com', 'bob@contoso.com']);
		expect((out as Record<string, unknown>)['@odata.nextLink']).toBe('n');
		expect(list[0].decodedBody).toBe('Hi Ann');
	});

	it('adds the start and the length of an event', () => {
		const event = {
			id: EVENT,
			subject: 'Call',
			body: { contentType: 'text', content: 'Agenda' },
			start: { dateTime: '2026-11-02T10:00:00.0000000', timeZone: 'UTC' },
			end: { dateTime: '2026-11-02T10:45:00.0000000', timeZone: 'UTC' },
		};

		expect(enrichOutlook(event)).toMatchObject({
			decodedBody: 'Agenda',
			isoDate: '2026-11-02T10:00:00.0000000Z',
			duration: '45m',
		});
	});

	it('does not add a zone to a local time, and skips a missing or negative length', () => {
		const local = enrichOutlook({
			start: { dateTime: '2026-11-02T10:00:00', timeZone: 'W. Europe Standard Time' },
			end: { dateTime: '2026-11-02T09:00:00', timeZone: 'W. Europe Standard Time' },
		}) as Record<string, unknown>;
		const open = enrichOutlook({ start: { dateTime: '2026-11-02T10:00:00' } }) as Record<
			string,
			unknown
		>;

		expect(local.isoDate).toBe('2026-11-02T10:00:00');
		expect(local.duration).toBeUndefined();
		expect(open.isoDate).toBe('2026-11-02T10:00:00Z');
		expect(open.duration).toBeUndefined();
	});

	it('returns a value without fields to add as it is', () => {
		expect(enrichOutlook('text')).toBe('text');
		expect(enrichOutlook(null)).toBeNull();
		expect(enrichOutlook({ id: 'x' })).toEqual({ id: 'x' });
	});
});

describe('Outlook lookups', () => {
	const lookups = OUTLOOK_PROFILE.lookups!;

	it('reads no object for a read, so a list needs no extra read', () => {
		expect(lookups('read_list_messages', { method: 'GET', path: `${ME}/messages` })).toEqual([]);
	});

	it('reads the message of a write on a message, with the id as it is', () => {
		const reads = lookups('write_post_messages_move', {
			method: 'POST',
			path: `${ME}/messages/${MSG}/move`,
		});

		expect(reads).toEqual([
			{
				tool: 'read_get_messages',
				args: { method: 'GET', path: `${ME}/messages/${encodeURIComponent(MSG)}` },
			},
		]);
	});

	it('reads the folder of a move too', () => {
		const reads = lookups('write_post_messages_move', {
			method: 'POST',
			path: `${ME}/messages/${MSG}/move`,
			body: { destinationId: FOLDER },
		});

		expect(reads.map((read) => read.tool)).toEqual(['read_get_messages', 'read_get_mailFolders']);
		expect(reads[1].args.path).toBe(`${ME}/mailFolders/${encodeURIComponent(FOLDER)}`);
	});

	it('does not read a well-known destination folder', () => {
		const reads = lookups('write_post_messages_move', {
			method: 'POST',
			path: `${ME}/messages/${MSG}/move`,
			body: { destinationId: 'inbox' },
		});

		expect(reads).toHaveLength(1);
	});

	it('keeps the mailbox of a shared mailbox and reads events and contacts', () => {
		const shared = lookups('write_delete_messages', {
			method: 'DELETE',
			path: `/v1.0/users/bob@contoso.com/messages/${MSG}`,
		});
		const event = lookups('write_patch_calendar_events', {
			method: 'PATCH',
			path: `${ME}/calendar/events/${EVENT}`,
		});
		const contact = lookups('write_patch_contacts', {
			method: 'PATCH',
			path: `${ME}/contacts/${MSG}`,
		});

		expect(shared[0].args.path).toBe(
			`/v1.0/users/bob@contoso.com/messages/${encodeURIComponent(MSG)}`,
		);
		expect(event[0]).toMatchObject({ tool: 'read_get_events' });
		expect(event[0].args.path).toBe(`${ME}/calendar/events/${encodeURIComponent(EVENT)}`);
		expect(contact[0]).toMatchObject({ tool: 'read_get_contacts' });
	});

	it.each([
		['a create', 'write_post_messages', `${ME}/messages`],
		['a send', 'write_post_sendMail', `${ME}/sendMail`],
		['a batch', 'write_post_$batch', '/v1.0/$batch'],
		['a well-known folder', 'write_post_messages', `${ME}/mailFolders/inbox/messages`],
	])('reads nothing for %s', (_label, tool, path) => {
		expect(lookups(tool, { method: 'POST', path })).toEqual([]);
	});

	it('reads a path with a broken escape as it is', () => {
		const reads = lookups('write_patch_messages', {
			method: 'PATCH',
			path: `${ME}/messages/AAMkbroken%ZZ0123456789`,
		});

		expect(reads).toHaveLength(1);
	});
});

describe('Outlook hydration rules', () => {
	it('copies a folder list only when the user made a folder', () => {
		const args = { method: 'GET', path: `${ME}/mailFolders` };
		const system = { value: [{ displayName: 'Inbox' }, { displayName: 'Sent Items' }] };
		const user = { value: [{ displayName: 'Inbox' }, { displayName: 'Clients' }] };

		expect(OUTLOOK_PROFILE.hydrateRead!(args, system)).toBe(false);
		expect(OUTLOOK_PROFILE.hydrateRead!(args, user)).toBe(true);
		expect(OUTLOOK_PROFILE.hydrateRead!(args, 'not an object')).toBe(false);
		expect(
			OUTLOOK_PROFILE.hydrateRead!(
				{ method: 'GET', path: `${ME}/mailFolders/${FOLDER}/childFolders` },
				user,
			),
		).toBe(true);
		expect(OUTLOOK_PROFILE.hydrateRead!({ method: 'GET', path: `${ME}/messages` }, {})).toBe(true);
	});

	it('copies the object of a write only when the gym did not make its id', () => {
		const write = (path: string, known: string[] = []) =>
			OUTLOOK_PROFILE.hydrateWrite!({ method: 'PATCH', path }, new Set(known));

		expect(write(`${ME}/messages/${MSG}`)).toBe(true);
		expect(write(`${ME}/messages/${MSG}`, [MSG])).toBe(false);
		expect(write(`${ME}/messages/${encodeURIComponent(MSG)}/move`, [MSG])).toBe(false);
		expect(write(`${ME}/messages`)).toBe(false);
		expect(write(`${ME}/sendMail`)).toBe(false);
	});
});

describe('withOutlookMailbox', () => {
	it('puts every message, folder, contact and calendar in the mailbox of the persona', () => {
		const out = withOutlookMailbox({
			entities: [{ kind: 'calendar_event' }],
			native: {
				outlook: {
					messages: [{ ref: 'message:a', from: 'bob@contoso.com' }, 'x'],
					folders: [{ ref: 'folder:a' }],
					contacts: [{ ref: 'contact:a' }],
					calendars: [{ name: 'Travel' }],
				},
			},
		}) as { native: { outlook: Record<string, Array<Record<string, unknown>>> } };

		const { outlook } = out.native;
		expect(outlook.messages[0]).toEqual({
			ref: 'message:a',
			from: 'bob@contoso.com',
			account: 'person:me',
		});
		expect(outlook.messages[1]).toBe('x');
		expect(outlook.folders[0].account).toBe('person:me');
		expect(outlook.contacts[0].account).toBe('person:me');
		expect(outlook.calendars[0].account).toBe('person:me');
	});

	it('overrides an account that the model wrote', () => {
		const out = withOutlookMailbox({
			native: { outlook: { messages: [{ ref: 'm', account: 'person:other' }] } },
		}) as { native: { outlook: { messages: Array<Record<string, unknown>> } } };

		expect(out.native.outlook.messages[0].account).toBe('person:me');
	});

	it('returns an overlay without outlook data as it is, and keeps a field that is no list', () => {
		const plain = { entities: [] };
		const odd = { native: { outlook: { messages: 'x' } } };

		expect(withOutlookMailbox(plain)).toBe(plain);
		expect(withOutlookMailbox({ native: {} })).toEqual({ native: {} });
		expect(withOutlookMailbox(odd)).toEqual(odd);
		expect(OUTLOOK_PROFILE.finalize).toBe(withOutlookMailbox);
	});
});

describe('secrets', () => {
	it('keeps the token and the query out of the log and out of what goes to the gym', async () => {
		const lines: string[] = [];
		const sink = (line: string) => lines.push(line);
		Container.set(Logger, { info: sink, warn: sink, error: sink } as unknown as Logger);
		const { router, gym } = setup();

		await router.handle(request('GET', `${ME}/messages?$search=%22qs-secret%22`));
		await router.handle(request('POST', `${ME}/sendMail`, { message: { subject: 'body-secret' } }));
		await router.handle(request('DELETE', `${ME}/messages/${MSG}`));

		expect(lines.length).toBeGreaterThan(0);
		for (const line of lines) {
			expect(line).not.toContain(TOKEN);
			expect(line).not.toContain('qs-secret');
			expect(line).not.toContain('body-secret');
		}
		expect(JSON.stringify(gym.callTool.mock.calls)).not.toContain(TOKEN);
	});
});

describe('Outlook hydrateRead for calendars', () => {
	const hydrate = OUTLOOK_PROFILE.hydrateRead!;
	const read = { method: 'GET', path: '/v1.0/me/calendars' };

	it('needs no copy when the list holds only the default calendar', () => {
		expect(hydrate(read, { value: [{ name: 'Calendar', isDefaultCalendar: true }] })).toBe(false);
	});

	it('copies the list when the user made a calendar', () => {
		expect(
			hydrate(read, {
				value: [
					{ name: 'Calendar', isDefaultCalendar: true },
					{ name: 'Travel', isDefaultCalendar: false },
				],
			}),
		).toBe(true);
	});
});
