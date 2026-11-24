import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import {
	enrichSheets,
	GOOGLE_SHEETS_PROFILE,
	sheetOfRange,
	withPlaceholderOwner,
} from '../google-sheets-profile';
import { HTTP_PROFILES } from '../http-profiles';
import { HttpGuardRouter } from '../http-router';
import type { McpCaller } from '../mcp-upstream';
import type { CapturedRequest } from '../network';
import { isReadShaped } from '../request-classifier';
import { toToolCall } from '../http-tool-caller';
import { isTokenExchange, loadVendorKnowledge, vendorForRequest } from '../vendor-knowledge';

const ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
const HOST = 'sheets.googleapis.com';
const BASE = `/v4/spreadsheets/${ID}`;
const RANGE = 'Sheet1!A1%3AC10';

const req = (method: string, path: string, body?: unknown, host = HOST) =>
	({
		method,
		url: new URL(`https://${host}${path}`),
		headers: { authorization: 'Bearer real-token-123' },
		body: body === undefined ? undefined : Buffer.from(JSON.stringify(body)),
	}) satisfies CapturedRequest;

describe('the Google Sheets vendor file', () => {
	const vendor = loadVendorKnowledge('googlesheets');

	it('names the Sheets host and only the spreadsheets path', () => {
		expect(vendor.name).toBe('googlesheets');
		expect(vendor.hosts).toEqual(['sheets.googleapis.com']);
		expect(vendor.pathPrefixes).toEqual(['/v4/spreadsheets']);
		expect(vendor.readPaths).toEqual([]);
		expect(vendor.instructions).toContain('native.google_sheets');
	});

	it('is chosen for a Sheets request only', () => {
		expect(vendorForRequest(HOST, BASE)?.name).toBe('googlesheets');
		expect(vendorForRequest(HOST, '/v4/spreadsheets')?.name).toBe('googlesheets');
		expect(vendorForRequest(HOST, '/v4/other')).toBeUndefined();
		expect(vendorForRequest('www.googleapis.com', BASE)).toBeUndefined();
		expect(vendorForRequest('www.googleapis.com', '/gmail/v1/users/me/labels')?.name).toBe('gmail');
	});

	it('keeps the token exchange of the shared sign-in host working with two vendors', () => {
		const call = (method: string, path: string) => ({
			method,
			url: new URL(`https://oauth2.googleapis.com${path}`),
		});

		expect(isTokenExchange(call('POST', '/token'))).toBe(true);
		expect(isTokenExchange(call('POST', '/revoke'))).toBe(false);
		expect(vendorForRequest('oauth2.googleapis.com', '/token')).toBeUndefined();
		expect(loadVendorKnowledge('gmail').passthroughHosts).toEqual(vendor.passthroughHosts);
	});

	it('has one profile with its own file name', () => {
		const names = HTTP_PROFILES.map((profile) => profile.name);

		expect(names).toEqual([...new Set(names)]);
		expect(names).toContain('googlesheets');
		expect(GOOGLE_SHEETS_PROFILE.credentialKind).toBe('google_oauth');
		expect(GOOGLE_SHEETS_PROFILE.credentialField).toBe('oauthTokenData.access_token');
		expect(GOOGLE_SHEETS_PROFILE.gymService).toBe('google-sheets');
	});
});

describe('routing of every operation of the Sheets node', () => {
	const vendor = loadVendorKnowledge('googlesheets');
	const read = (r: ReturnType<typeof req>) => isReadShaped(r, vendor.readPaths);

	it.each([
		['read rows (values)', 'GET', `${BASE}/values/${RANGE}`],
		['get all tabs (spreadsheet)', 'GET', BASE],
		['batchGet', 'GET', `${BASE}/values:batchGet`],
		['get the tabs of a spreadsheet', 'GET', `${BASE}?fields=sheets.properties`],
	])('treats %s as a read', (_name, method, path) => {
		expect(read(req(method, path))).toBe(true);
	});

	it.each([
		['append', 'POST', `${BASE}/values/${RANGE}:append`],
		['update (put values)', 'PUT', `${BASE}/values/${RANGE}`],
		['update (batch of values)', 'POST', `${BASE}/values:batchUpdate`],
		['clear', 'POST', `${BASE}/values/${RANGE}:clear`],
		['create or delete a tab, format (batchUpdate)', 'POST', `${BASE}:batchUpdate`],
		['create a spreadsheet', 'POST', '/v4/spreadsheets'],
		['unknown PATCH', 'PATCH', BASE],
		['unknown DELETE', 'DELETE', BASE],
		['a POST that reads in the real API (getByDataFilter)', 'POST', `${BASE}:getByDataFilter`],
	])('treats %s as a write', (_name, method, path) => {
		const request = req(method, path, {});
		expect(read(request)).toBe(false);
		expect(toToolCall(request, false).name.startsWith('write_')).toBe(true);
	});

	it('names an id-like range, a long id and an encoded title in the args path', () => {
		const call = toToolCall(req('GET', `${BASE}/values/'My%20tab'!A1%3AC10`), true);

		expect(call.name.startsWith('read_')).toBe(true);
		expect(call.args.path).toBe(`${BASE}/values/'My%20tab'!A1%3AC10`);
	});
});

describe('sheetOfRange', () => {
	it.each([
		['Sheet1!A1:C10', 'Sheet1'],
		["'My tab'!A:B", 'My tab'],
		["'It''s here'!A1", "It's here"],
		["'Only title'", 'Only title'],
		["'It''s'", "It's"],
	])('reads the title of %s', (range, title) => {
		expect(sheetOfRange(range)).toBe(title);
	});

	it.each(['A1:C10', 'Sheet1', '!A1'])('finds no title in %s', (range) => {
		expect(sheetOfRange(range)).toBeUndefined();
	});
});

describe('enrichSheets', () => {
	it('adds the tab and a grid that starts at A1', () => {
		const out = enrichSheets({
			range: "'My tab'!B2:C3",
			majorDimension: 'ROWS',
			values: [['a', 'b'], ['c']],
		}) as { sheetTitle: string; grid: unknown[][] };

		expect(out.sheetTitle).toBe('My tab');
		expect(out.grid).toEqual([[], ['', 'a', 'b'], ['', 'c']]);
	});

	it('keeps a range from A1 as it is and handles a missing cell part', () => {
		const out = enrichSheets({ range: 'Sheet1!A1:B2', values: [['x']] }) as { grid: unknown[][] };
		const whole = enrichSheets({ range: 'Sheet1', values: [['x']] }) as { grid: unknown[][] };
		const column = enrichSheets({ range: 'Sheet1!C:D', values: [['x']] }) as { grid: unknown[][] };

		expect(out.grid).toEqual([['x']]);
		expect(whole.grid).toEqual([['x']]);
		expect(column.grid).toEqual([['', '', 'x']]);
	});

	it('pads a row that is not an array and caps the number of rows', () => {
		const rows = Array.from({ length: 1500 }, () => ['x']);
		const out = enrichSheets({ range: 'S!B1:B1500', values: [null, ...rows] }) as {
			grid: unknown[][];
		};

		expect(out.grid[0]).toEqual(['']);
		expect(out.grid).toHaveLength(1000);
	});

	it('enriches every range of a batchGet answer', () => {
		const out = enrichSheets({
			spreadsheetId: ID,
			valueRanges: [{ range: 'A!A1:A1', values: [['1']] }, 'x'],
		}) as { valueRanges: Array<Record<string, unknown>> };

		expect(out.valueRanges[0].grid).toEqual([['1']]);
		expect(out.valueRanges[1]).toBe('x');
	});

	it('leaves other answers as they are', () => {
		const metadata = { spreadsheetId: ID, sheets: [] };

		expect(enrichSheets(metadata)).toEqual(metadata);
		expect(enrichSheets({ range: 'A!A1', values: 'no' })).toEqual({ range: 'A!A1', values: 'no' });
		expect(enrichSheets({ range: 'A1' })).toEqual({ range: 'A1' });
		expect(enrichSheets(null)).toBeNull();
		expect(enrichSheets([1])).toEqual([1]);
	});
});

describe('Google Sheets lookups', () => {
	const lookups = GOOGLE_SHEETS_PROFILE.lookups!;
	const get = (path: string, query?: Record<string, string>) => ({ method: 'GET', path, query });

	it('looks up the spreadsheet for a values read, so the gym gets its id and titles', () => {
		const found = lookups('read_get_spreadsheets_values', get(`${BASE}/values/${RANGE}`));

		expect(found).toHaveLength(1);
		expect(found[0].tool.startsWith('read_')).toBe(true);
		expect(found[0].args.path).toBe(BASE);
		expect(String((found[0].args.query as Record<string, string>).fields)).toContain(
			'spreadsheetId',
		);
	});

	it('looks up the spreadsheet for a read with a fields filter, but not for the full read', () => {
		expect(
			lookups('read_get_spreadsheets', get(BASE, { fields: 'sheets.properties' })),
		).toHaveLength(1);
		expect(lookups('read_get_spreadsheets', get(BASE))).toEqual([]);
	});

	it('looks up the spreadsheet and the tab for an append, also with a quoted title', () => {
		const found = lookups('write_post_spreadsheets', {
			method: 'POST',
			path: `${BASE}/values/%27My%20tab%27!A1%3AC10:append`,
		});

		expect(found.map((f) => f.args.path)).toEqual([
			BASE,
			`${BASE}/values/${encodeURIComponent("'My tab'")}`,
		]);
	});

	it('looks up the tabs that a batch update names, at most three', () => {
		const data = ['A', 'B', 'C', 'D', 'A'].map((tab) => ({ range: `${tab}!A1:B2` }));
		const found = lookups('write_post_spreadsheets', {
			method: 'POST',
			path: `${BASE}/values:batchUpdate`,
			body: { data },
		});

		expect(found).toHaveLength(4);
	});

	it('looks up the spreadsheet only for a write without a tab, and for a structure batch update', () => {
		expect(
			lookups('write_post_spreadsheets', { method: 'POST', path: `${BASE}:batchUpdate`, body: {} }),
		).toHaveLength(1);
		expect(
			lookups('write_put_spreadsheets', {
				method: 'PUT',
				path: `${BASE}/values/A1%3AB2`,
			}),
		).toHaveLength(1);
		expect(
			lookups('write_post_spreadsheets', {
				method: 'POST',
				path: `${BASE}/values/%E0%A4%A:append`,
			}),
		).toHaveLength(1);
	});

	it('looks up nothing for a create, or for a segment that is no id', () => {
		expect(
			lookups('write_post_spreadsheets', { method: 'POST', path: '/v4/spreadsheets' }),
		).toEqual([]);
		expect(lookups('read_get_spreadsheets', get('/v4/spreadsheets/short'))).toEqual([]);
		expect(lookups('read_get_x', get('/other'))).toEqual([]);
	});

	it('hydrates a write only for a spreadsheet that the gym did not make', () => {
		const hydrate = GOOGLE_SHEETS_PROFILE.hydrateWrite!;
		const args = { method: 'POST', path: `${BASE}/values/${RANGE}:append` };

		expect(hydrate(args, new Set())).toBe(true);
		expect(hydrate(args, new Set([ID]))).toBe(false);
		expect(hydrate({ method: 'POST', path: '/v4/spreadsheets' }, new Set())).toBe(false);
		expect(hydrate({ method: 'POST', path: '/v4/spreadsheets/short:batchUpdate' }, new Set())).toBe(
			false,
		);
	});
});

describe('withPlaceholderOwner', () => {
	it('removes the owner, the sharing list and the extra accounts under both names of the service', () => {
		const out = withPlaceholderOwner({
			world_version: 1,
			native: {
				google_sheets: {
					accounts: [{ email: 'a@b.test' }],
					service_accounts: [{ email: 'robot@b.test' }],
					spreadsheets: [
						{ ref: 's', id: ID, owner: 'person:x', shared_with: ['person:y'], title: 'T' },
						5,
					],
				},
				'google-sheets': { spreadsheets: [{ owner: 'x', title: 'U' }] },
				other: { keep: true },
			},
		});

		expect(out.native).toEqual({
			google_sheets: { spreadsheets: [{ ref: 's', id: ID, title: 'T' }, 5] },
			'google-sheets': { spreadsheets: [{ title: 'U' }] },
			other: { keep: true },
		});
	});

	it('leaves an overlay without the Sheets block, or without native data, as it is', () => {
		const plain = { world_version: 1 };
		const other = { native: { notion: {} } };

		expect(withPlaceholderOwner(plain)).toBe(plain);
		expect(withPlaceholderOwner(other)).toEqual(other);
		expect(withPlaceholderOwner({ native: { google_sheets: { accounts: [] } } })).toEqual({
			native: { google_sheets: {} },
		});
	});
});

describe('the guard on a Sheets request', () => {
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
			profile: GOOGLE_SHEETS_PROFILE,
		});
		return { router, upstream, gym, hydrator };
	}

	it.each([
		['POST', `${BASE}/values/${RANGE}:append`],
		['PUT', `${BASE}/values/${RANGE}`],
		['POST', `${BASE}/values:batchUpdate`],
		['POST', `${BASE}/values/${RANGE}:clear`],
		['POST', `${BASE}:batchUpdate`],
		['POST', '/v4/spreadsheets'],
	])('sends %s %s only to the gym', async (method, path) => {
		const { router, upstream, gym } = setup();

		const res = await router.handle(req(method, path, { values: [['x']] }));

		expect(res.status).toBe(200);
		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('reads the real service first for a values read, then answers from the gym', async () => {
		const { router, upstream, gym, hydrator } = setup();

		await router.handle(req('GET', `${BASE}/values/${RANGE}`));

		expect(upstream.callTool).toHaveBeenCalledTimes(1);
		expect(hydrator.hydrate).toHaveBeenCalledTimes(1);
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('answers a read of a spreadsheet that the gym made from the gym alone', async () => {
		const { router, upstream, gym, hydrator } = setup();
		gym.callTool.mockResolvedValueOnce(
			result({ spreadsheetId: 'GYMmade0000000000000000000000000000000000000' }),
		);
		await router.handle(req('POST', '/v4/spreadsheets', { properties: { title: 'x' } }));

		await router.handle(
			req(
				'GET',
				'/v4/spreadsheets/GYMmade0000000000000000000000000000000000000/values/Sheet1!A1%3AB2',
			),
		);

		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(hydrator.hydrate).not.toHaveBeenCalled();
	});

	it('does not hydrate a write on a spreadsheet that the gym made', async () => {
		const { router, gym, hydrator } = setup();
		gym.callTool.mockResolvedValueOnce(
			result({ spreadsheetId: 'GYMmade0000000000000000000000000000000000000' }),
		);
		await router.handle(req('POST', '/v4/spreadsheets', {}));

		await router.handle(
			req('POST', '/v4/spreadsheets/GYMmade0000000000000000000000000000000000000:batchUpdate', {}),
		);

		expect(hydrator.hydrateWrite).not.toHaveBeenCalled();
	});

	it('hydrates a write on a real spreadsheet before the gym call', async () => {
		const { router, hydrator } = setup();

		await router.handle(req('POST', `${BASE}/values/${RANGE}:append`, { values: [['x']] }));

		expect(hydrator.hydrateWrite).toHaveBeenCalledTimes(1);
	});

	it('refuses a delete on a path that no vendor owns', async () => {
		const { router, upstream, gym } = setup();

		const res = await router.handle(
			req('DELETE', `/tasks/v1/lists/${ID}`, undefined, 'www.googleapis.com'),
		);

		expect(res.status).toBe(403);
		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).not.toHaveBeenCalled();
	});

	it('does not put the token, the query or the body in a log line or in a call to the gym', async () => {
		const lines: string[] = [];
		const sink = (line: string) => lines.push(line);
		Container.set(Logger, { info: sink, warn: sink, error: sink } as unknown as Logger);
		const { router, gym, hydrator } = setup();

		await router.handle(req('GET', `${BASE}/values/${RANGE}?secretQuery=abc`));
		await router.handle(
			req('POST', `${BASE}/values/${RANGE}:append`, { values: [['secretCell']] }),
		);

		const text = lines.join('\n');
		expect(text).toContain('mcp-guard http GET sheets.googleapis.com');
		expect(text).not.toContain('real-token-123');
		expect(text).not.toContain('secretQuery');
		expect(text).not.toContain('secretCell');
		const sent = JSON.stringify([gym.callTool.mock.calls, hydrator.hydrate.mock.calls]);
		expect(sent).not.toContain('real-token-123');
	});
});
