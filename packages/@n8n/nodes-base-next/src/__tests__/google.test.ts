import { toNodeType, validate, type Action } from '@n8n/node-sdk';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { simplifyOutput } from 'n8n-nodes-base/dist/nodes/Google/Gmail/GenericFunctions';
import { GoogleSheet } from 'n8n-nodes-base/dist/nodes/Google/Sheet/v2/helpers/GoogleSheet';
import { prepareSheetData } from 'n8n-nodes-base/dist/nodes/Google/Sheet/v2/helpers/GoogleSheets.utils';

import { getGmailMessage } from '../nodes/gmail/message.get';
import { getManyGmailMessages } from '../nodes/gmail/message.get-all';
import { sendGmailMessage } from '../nodes/gmail/message.send';
import { messageGemini } from '../nodes/google-gemini/text.message';
import { appendSheetRow } from '../nodes/google-sheets/sheet.append';
import { appendOrUpdateSheetRow } from '../nodes/google-sheets/sheet.append-or-update';
import { readSheetRows } from '../nodes/google-sheets/sheet.read';

interface Options {
	method: string;
	url: string;
	qs?: Record<string, unknown>;
	body?: unknown;
}

interface Call {
	credentialType: string;
	options: Options;
}

function run(
	action: Action,
	parameters: Record<string, unknown>,
	respond: (options: Options) => unknown,
) {
	const calls: Call[] = [];
	const credentials = Object.fromEntries(
		action.credentialTypes.map((type) => [type, { id: '1', name: type }]),
	);
	const context = {
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: 'Node', credentials }),
		getNodeParameter: (name: string) => parameters[name],
		continueOnFail: () => false,
		helpers: {
			httpRequestWithAuthentication: async (credentialType: string, options: Options) => {
				calls.push({ credentialType, options });
				return respond(options);
			},
		},
	};
	const NodeType = toNodeType(action);
	const result = new NodeType().execute?.call(context as unknown as IExecuteFunctions);
	const items = result?.then((output) =>
		(Array.isArray(output) ? (output[0] ?? []) : []).map((item) => item.json),
	);
	return { items, calls };
}

const SPREADSHEET = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET}`;
const META = { sheets: [{ properties: { sheetId: 7, title: 'Leads' } }] };

function sheetsApi(values: unknown[][]) {
	return (options: Options) => {
		if (options.url === BASE) return META;
		if (options.method === 'GET') return values.length ? { values } : {};
		return {};
	};
}

const legacySheet = () =>
	new GoogleSheet(SPREADSHEET, {
		getNode: () => ({ name: 'Legacy' }),
	} as unknown as IExecuteFunctions);

const location = {
	spreadsheet: `https://docs.google.com/spreadsheets/d/${SPREADSHEET}/edit#gid=7`,
	sheet: { mode: 'name', name: 'Leads' },
};

describe('googleSheets.sheet.read', () => {
	const values = [
		['', '', ''],
		['Name', 'Status', 'Score', ''],
		['Ada', 'new', 3],
		[],
		['Bob', 'done'],
		['Cy', 'new', 5, ''],
	];

	it('reads the tab and structures rows like the v4.7 node', async () => {
		const { items, calls } = run(readSheetRows, location, sheetsApi(values));
		const { data, headerRow, firstDataRow } = prepareSheetData(structuredClone(values), {
			rangeDefinition: 'detectAutomatically',
		});
		const expected = legacySheet().structureArrayDataByColumn(
			data as string[][],
			headerRow,
			firstDataRow,
		);

		expect(await items).toEqual(expected);
		expect(expected[0]).toEqual({ row_number: 3, Name: 'Ada', Status: 'new', Score: 3, col_4: '' });
		expect(expected).toHaveLength(3);
		expect(calls.map((call) => [call.credentialType, call.options.url, call.options.qs])).toEqual([
			['googleSheetsOAuth2Api', BASE, { fields: 'sheets.properties' }],
			[
				'googleSheetsOAuth2Api',
				`${BASE}/values/'Leads'`,
				{ valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
			],
		]);
	});

	it.each([
		['AND', true],
		['OR', false],
	] as const)('filters rows like lookupValues with combine %s', async (combine, allMatches) => {
		const filters = [
			{ column: 'Status', value: 'new' },
			{ column: 'Score', value: '5' },
		];
		const { items } = run(
			readSheetRows,
			{ ...location, filters, combine, allMatches },
			sheetsApi(values),
		);
		const { data, headerRow, firstDataRow } = prepareSheetData(structuredClone(values), {
			rangeDefinition: 'detectAutomatically',
		});
		const expected = await legacySheet().lookupValues({
			inputData: data as string[][],
			keyRowIndex: headerRow,
			dataStartRowIndex: firstDataRow,
			lookupValues: filters.map(({ column, value }) => ({
				lookupColumn: column,
				lookupValue: value,
			})),
			returnAllMatches: allMatches,
			nodeVersion: 4.7,
			combineFilters: combine,
		});

		expect(await items).toEqual(expected);
		expect(expected.length).toBeGreaterThan(0);
	});

	it('reads fixed header and data rows like specifyRange', async () => {
		const header = { headerRow: 2, firstDataRow: 3 };
		const range = { headerRow: '2', firstDataRow: '3' };
		const { items } = run(readSheetRows, { ...location, header }, sheetsApi(values));
		const { data } = prepareSheetData(structuredClone(values), {
			rangeDefinition: 'specifyRange',
			...range,
		});

		expect(await items).toEqual(legacySheet().structureArrayDataByColumn(data as string[][], 1, 2));
	});

	it('derives the columns a filter guarantees', () => {
		const output = readSheetRows.deriveOutput?.({
			...location,
			sheet: { mode: 'name', name: 'Leads' },
			filters: [
				{ column: 'Status', value: 'new' },
				{ column: '={{ $json.column }}', value: 'x' },
			],
		});
		expect(output?.required).toEqual(['row_number', 'Status']);
	});

	it('rejects a sheet without a mode', () => {
		expect(validate({ ...location, sheet: 'Sheet1' }, readSheetRows.inputSchema).join()).toContain(
			'input.sheet: needs "mode"',
		);
	});
});

describe('googleSheets.sheet.append', () => {
	it('grows the grid and writes the mapped values after the last row', async () => {
		const values = { Email: 'b@x.io', Plan: { tier: 'free' }, Extra: 1 };
		const { items, calls } = run(
			appendSheetRow,
			{ ...location, values },
			sheetsApi([
				['Email', 'Plan'],
				['a@x.io', 'pro'],
			]),
		);

		expect(await items).toEqual([values]);
		expect(
			calls.slice(2).map(({ options }) => [options.method, options.url, options.qs, options.body]),
		).toEqual([
			[
				'POST',
				`${BASE}:batchUpdate`,
				{},
				{ requests: [{ appendDimension: { sheetId: 7, dimension: 'ROWS', length: 1 } }] },
			],
			[
				'PUT',
				`${BASE}/values/'Leads'!3%3A3`,
				{ valueInputOption: 'USER_ENTERED' },
				{ range: "'Leads'!3:3", values: [['b@x.io', '{"tier":"free"}']] },
			],
		]);
	});

	it('writes a header from the value keys on an empty sheet', async () => {
		const { items, calls } = run(
			appendSheetRow,
			{ ...location, values: { Email: 'b@x.io', row_number: 4 } },
			sheetsApi([]),
		);
		await items;

		expect(
			calls.filter(({ options }) => options.method === 'PUT').map(({ options }) => options.body),
		).toEqual([
			{ range: "'Leads'!1:1", values: [['Email']] },
			{ range: "'Leads'!2:2", values: [['b@x.io']] },
		]);
	});

	it('derives the written keys', () => {
		expect(
			appendSheetRow.deriveOutput?.({
				...location,
				sheet: { mode: 'id', id: '7' },
				values: { Email: 'x' },
			})?.required,
		).toEqual(['Email']);
	});
});

describe('googleSheets.sheet.appendOrUpdate', () => {
	const rows = [
		['Email', 'Plan'],
		['a@x.io', 'pro'],
	];

	it('updates the cells of the matching row', async () => {
		const values = { Email: 'a@x.io', Plan: null };
		const { items, calls } = run(
			appendOrUpdateSheetRow,
			{ ...location, values, matchOn: 'Email', cellFormat: 'RAW' },
			sheetsApi(rows),
		);

		expect(await items).toEqual([{ Email: 'a@x.io', Plan: '' }]);
		expect(calls.slice(2).map(({ options }) => [options.url, options.body])).toEqual([
			[
				`${BASE}/values:batchUpdate`,
				{ data: [{ range: "'Leads'!B2", values: [['']] }], valueInputOption: 'RAW' },
			],
		]);
	});

	it('appends when no row matches', async () => {
		const { items, calls } = run(
			appendOrUpdateSheetRow,
			{ ...location, values: { Email: 'c@x.io', Plan: 'team' }, matchOn: 'Email' },
			sheetsApi(rows),
		);

		await items;
		expect(calls.slice(2).map(({ options }) => options.body)).toEqual([
			{ requests: [{ appendDimension: { sheetId: 7, dimension: 'ROWS', length: 1 } }] },
			{ range: "'Leads'!3:3", values: [['c@x.io', 'team']] },
		]);
	});

	it('fails when values has no key', async () => {
		const { items } = run(
			appendOrUpdateSheetRow,
			{ ...location, values: { Plan: 'team' }, matchOn: 'Email' },
			sheetsApi(rows),
		);
		await expect(items).rejects.toThrow('values needs a value for the matchOn column "Email"');
	});
});

const GMAIL = 'https://www.googleapis.com/gmail/v1/users/me';
const LABELS = {
	labels: [
		{ id: 'INBOX', name: 'INBOX', type: 'system' },
		{ id: 'L1', name: 'Work' },
	],
};

const metadata = (id: string) => ({
	id,
	threadId: `t-${id}`,
	labelIds: ['INBOX', 'UNREAD'],
	snippet: 'Hello &amp; welcome',
	payload: {
		partId: '',
		mimeType: 'text/plain',
		filename: '',
		headers: [
			{ name: 'From', value: 'Ada <ada@x.io>' },
			{ name: 'Subject', value: 'Hi' },
		],
		body: { size: 0 },
	},
	sizeEstimate: 1024,
	historyId: '42',
	internalDate: '1767225600000',
});

function gmailApi(options: Options) {
	if (options.url === `${GMAIL}/labels`) return LABELS;
	if (options.url.startsWith(`${GMAIL}/messages?`)) {
		return options.url.includes('pageToken=')
			? { messages: [{ id: 'm3' }] }
			: { messages: [{ id: 'm1' }, { id: 'm2' }], nextPageToken: 'p2' };
	}
	const id = /messages\/([^?]+)\?/.exec(options.url)?.[1] ?? '';
	return metadata(id);
}

async function legacySimplified(ids: string[]) {
	const legacy = {
		getNodeParameter: () => 'oAuth2',
		getNode: () => ({ name: 'Legacy' }),
		helpers: { requestWithAuthentication: async () => LABELS },
	};
	return await simplifyOutput.call(
		legacy as unknown as IExecuteFunctions,
		ids.map((id) => metadata(id) as unknown as IDataObject),
	);
}

describe('gmail.message.getAll', () => {
	it('searches, pages, and simplifies like the v2 node', async () => {
		const { items, calls } = run(
			getManyGmailMessages,
			{
				filters: {
					readStatus: 'unread',
					sender: 'ada@x.io',
					labelIds: ['INBOX', 'L1'],
					receivedAfter: '2026-01-01T00:00:00Z',
				},
				paging: { mode: 'all' },
			},
			gmailApi,
		);

		expect(await items).toEqual(await legacySimplified(['m1', 'm2', 'm3']));
		const list = new URL(calls[0]?.options.url ?? '');
		expect(list.searchParams.get('q')).toBe('from:ada@x.io is:unread after:1767225600');
		expect(list.searchParams.getAll('labelIds')).toEqual(['INBOX', 'L1']);
		expect(list.searchParams.get('maxResults')).toBe('100');
		expect(new URL(calls[1]?.options.url ?? '').searchParams.get('pageToken')).toBe('p2');
		const message = new URL(calls[3]?.options.url ?? '');
		expect(message.pathname).toBe('/gmail/v1/users/me/messages/m1');
		expect(message.searchParams.get('format')).toBe('metadata');
		expect(message.searchParams.getAll('metadataHeaders')).toEqual([
			'From',
			'To',
			'Cc',
			'Bcc',
			'Subject',
		]);
		expect(calls.every((call) => call.credentialType === 'gmailOAuth2')).toBe(true);
	});

	it('stops after the first page with a limit', async () => {
		const { items, calls } = run(
			getManyGmailMessages,
			{ paging: { mode: 'limit', max: 2 } },
			gmailApi,
		);
		expect(await items).toHaveLength(2);
		expect(new URL(calls[0]?.options.url ?? '').searchParams.get('maxResults')).toBe('2');
	});
});

describe('gmail.message.get', () => {
	it('emits the simplified message', async () => {
		const { items } = run(getGmailMessage, { messageId: 'm9' }, gmailApi);
		expect(await items).toEqual(await legacySimplified(['m9']));
	});
});

describe('gmail.message.send', () => {
	it('sends a MIME message with the attribution footer', async () => {
		const { items, calls } = run(
			sendGmailMessage,
			{
				to: 'ada@x.io, Bob <bob@x.io>',
				subject: 'Grüße',
				body: { format: 'text', text: ' Hi Ada ' },
				senderName: 'Ops',
			},
			(options) =>
				options.url.endsWith('/profile')
					? { emailAddress: 'ops@x.io' }
					: { id: 's1', threadId: 't1', labelIds: ['SENT'] },
		);

		expect(await items).toEqual([{ id: 's1', threadId: 't1', labelIds: ['SENT'] }]);
		const send = calls[1]?.options;
		expect(send?.url).toBe(`${GMAIL}/messages/send`);
		const body = send?.body as { raw: string };
		const [head = '', encoded = ''] = Buffer.from(body.raw, 'base64url')
			.toString()
			.split('\r\n\r\n');
		expect(head.split('\r\n')).toEqual([
			'From: Ops <ops@x.io>',
			'To: ada@x.io, Bob <bob@x.io>',
			`Subject: =?UTF-8?B?${Buffer.from('Grüße').toString('base64')}?=`,
			'MIME-Version: 1.0',
			'Content-Type: text/plain; charset=utf-8',
			'Content-Transfer-Encoding: base64',
		]);
		expect(Buffer.from(encoded, 'base64').toString()).toBe(
			'Hi Ada\n\n---\nThis email was sent automatically with n8n\nhttps://n8n.io',
		);
	});

	it('rejects an address without @', async () => {
		const { items } = run(
			sendGmailMessage,
			{ to: 'ada', subject: 'x', body: { format: 'html', html: '<p>x</p>' } },
			() => ({}),
		);
		await expect(items).rejects.toThrow("'ada' in the 'To' field isn't valid");
	});
});

describe('googleGemini.text.message', () => {
	it('posts generateContent and emits one item per candidate with the merged text', async () => {
		const candidate = {
			content: { parts: [{ text: 'Hello' }, { text: ', world' }], role: 'model' },
			finishReason: 'STOP',
			index: 0,
		};
		const { items, calls } = run(
			messageGemini,
			{
				model: 'gemini-2.5-flash',
				messages: [{ content: 'Say hello' }, { role: 'model', content: '  ' }],
				systemMessage: 'Be brief',
				jsonOutput: true,
				temperature: 0.2,
			},
			() => ({ candidates: [candidate], usageMetadata: { totalTokenCount: 5 } }),
		);

		expect(await items).toEqual([{ ...candidate, mergedResponse: 'Hello, world' }]);
		expect(calls[0]).toMatchObject({
			credentialType: 'googlePalmApi',
			options: {
				method: 'POST',
				url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
			},
		});
		expect(calls[0]?.options.body).toEqual({
			contents: [{ parts: [{ text: 'Say hello' }], role: 'user' }],
			generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
			systemInstruction: { parts: [{ text: 'Be brief' }] },
		});
	});

	it('reports a blocked prompt', async () => {
		const { items } = run(
			messageGemini,
			{ model: 'models/gemini-2.5-flash', messages: [{ content: 'x' }] },
			() => ({ promptFeedback: { blockReason: 'SAFETY' } }),
		);
		await expect(items).rejects.toThrow('Gemini returned no reply: SAFETY');
	});
});
