import { validate, type Action } from '@n8n/node-sdk';
import { toNodeType } from '@n8n/node-sdk/host';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import {
	parseRawEmail,
	simplifyOutput,
} from 'n8n-nodes-base/dist/nodes/Google/Gmail/GenericFunctions';
import { GoogleSheet } from 'n8n-nodes-base/dist/nodes/Google/Sheet/v2/helpers/GoogleSheet';
import { prepareSheetData } from 'n8n-nodes-base/dist/nodes/Google/Sheet/v2/helpers/GoogleSheets.utils';

import { getGmailMessage } from '../nodes/gmail/actions/message.get';
import { getManyGmailMessages } from '../nodes/gmail/actions/message.get-all';
import { sendGmailMessage } from '../nodes/gmail/actions/message.send';
import { mixedMessage } from '../nodes/gmail/mime';
import { messageGemini } from '../nodes/google-gemini/actions/text.message';
import { appendSheetRow } from '../nodes/google-sheets/actions/sheet.append';
import { appendOrUpdateSheetRow } from '../nodes/google-sheets/actions/sheet.append-or-update';
import { readSheetRows } from '../nodes/google-sheets/actions/sheet.read';

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
	const hints: Array<{ message: string }> = [];
	const credentials = Object.fromEntries(
		action.credentialTypes.map((type) => [type, { id: '1', name: type }]),
	);
	const context = {
		addExecutionHints: (...added: Array<{ message: string }>) => hints.push(...added),
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: 'Node', credentials }),
		getNodeParameter: (name: string) => parameters[name],
		// The Gemini credential has a base URL, so the runtime reads its data.
		getCredentials: async () => ({ apiKey: 'g-1' }),
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
	return { items, calls, hints };
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

	it('reads a user column named row_number as row_number_1', async () => {
		const { items } = run(
			readSheetRows,
			location,
			sheetsApi([
				['row_number', 'Name'],
				['x-1', 'Ada'],
			]),
		);
		expect(await items).toEqual([{ row_number: 2, row_number_1: 'x-1', Name: 'Ada' }]);
	});

	it('rejects a sheet without a mode', () => {
		expect(validate({ ...location, sheet: 'Sheet1' }, readSheetRows.inputSchema).join()).toContain(
			'input.sheet: needs "mode"',
		);
	});
});

describe('googleSheets.sheet.append', () => {
	it('adds a column for a new key and appends the values after the last row', async () => {
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
				'PUT',
				`${BASE}/values/'Leads'!1%3A1`,
				{ valueInputOption: 'RAW' },
				{ range: "'Leads'!1:1", values: [['Email', 'Plan', 'Extra']] },
			],
			[
				'POST',
				`${BASE}/values/'Leads'!3%3A3:append`,
				{ valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS' },
				{ range: "'Leads'!3:3", values: [['b@x.io', '{"tier":"free"}', 1]] },
			],
		]);
	});

	it('rejects an empty header row above data', async () => {
		const { items, calls } = run(
			appendSheetRow,
			{ ...location, values: { Email: 'b@x.io' } },
			sheetsApi([[], ['a@x.io']]),
		);
		await expect(items).rejects.toThrow('Header row 1 is empty');
		expect(calls).toHaveLength(2);
	});

	it('writes a header from the value keys on an empty sheet', async () => {
		const { items, calls } = run(
			appendSheetRow,
			{ ...location, values: { Email: 'b@x.io', row_number: 4 } },
			sheetsApi([]),
		);
		await items;

		expect(calls.slice(2).map(({ options }) => [options.method, options.body])).toEqual([
			['PUT', { range: "'Leads'!1:1", values: [['Email']] }],
			['POST', { range: "'Leads'!2:2", values: [['b@x.io']] }],
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
		expect(calls[1]?.options.qs?.valueRenderOption).toBe('UNFORMATTED_VALUE');
		expect(calls.slice(2).map(({ options }) => [options.url, options.body])).toEqual([
			[
				`${BASE}/values/'Leads'!3%3A3:append`,
				{ range: "'Leads'!3:3", values: [['c@x.io', 'team']] },
			],
		]);
	});

	it('updates only the first column of a repeated header name', async () => {
		const { items, calls } = run(
			appendOrUpdateSheetRow,
			{ ...location, values: { id: 1, a: 'n' }, matchOn: 'id' },
			sheetsApi([
				['id', 'a', 'a'],
				[1, 'o', 'o2'],
			]),
		);
		await items;
		expect(calls.slice(2).map(({ options }) => options.body)).toEqual([
			{ data: [{ range: "'Leads'!B2", values: [['n']] }], valueInputOption: 'USER_ENTERED' },
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
	if (options.url === `${GMAIL}/messages`) {
		return options.qs?.pageToken
			? { messages: [{ id: 'm3' }] }
			: { messages: [{ id: 'm1' }, { id: 'm2' }], nextPageToken: 'p2' };
	}
	return metadata(options.url.split('/').pop() ?? '');
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
		expect(calls[0]?.options.qs).toEqual({
			q: 'from:ada@x.io is:unread after:1767225600',
			labelIds: ['INBOX', 'L1'],
			maxResults: 100,
		});
		expect(calls[1]?.options.qs).toMatchObject({ pageToken: 'p2' });
		expect(calls[3]?.options).toMatchObject({
			url: `${GMAIL}/messages/m1`,
			qs: { format: 'metadata', metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject'] },
		});
		expect(calls.every((call) => call.credentialType === 'gmailOAuth2')).toBe(true);
	});

	it('stops after the first page with a limit', async () => {
		const { items, calls } = run(
			getManyGmailMessages,
			{ paging: { mode: 'limit', max: 2 } },
			gmailApi,
		);
		expect(await items).toHaveLength(2);
		expect(calls[0]?.options.qs?.maxResults).toBe(2);
	});
});

describe('gmail.message.get', () => {
	it('emits the simplified message', async () => {
		const { items } = run(getGmailMessage, { messageId: 'm9' }, gmailApi);
		expect(await items).toEqual(await legacySimplified(['m9']));
	});

	it('emits a message with missing fields and warns', async () => {
		const { historyId: _historyId, sizeEstimate: _size, ...partial } = metadata('m9');
		const { items, hints } = run(getGmailMessage, { messageId: 'm9' }, (options) =>
			options.url === `${GMAIL}/labels` ? LABELS : partial,
		);
		expect((await items)?.map((item) => item.id)).toEqual(['m9']);
		// The output is a union of both shapes, so the warning cannot name the fields.
		expect(hints.map(({ message }) => message)).toEqual([
			expect.stringContaining('output[0]: does not match any allowed shape'),
		]);
	});
});

const crlf = (text: string) => text.replace(/\r?\n/g, '\r\n');
const b64 = (text: string) => Buffer.from(text).toString('base64');

const RAW_MESSAGES: Record<string, string> = {
	plain: `From: "Ada Lovelace" <ada@example.com>
To: grace@example.com, "Doe, John" <john@example.com>, Linus <linus@example.org>
Cc: Team: a@example.com, B <b@example.com>;, undisclosed-recipients:;
Reply-To: <reply@example.com>
Subject: =?UTF-8?B?R3LDvMOfZSBhdXMgS8O2bG4=?=
Date: Thu, 01 Jan 2026 10:00:00 +0000
Message-ID: <abc123@mail.example.com>
In-Reply-To: <prev@mail.example.com>
References: <one@example.com> <prev@mail.example.com>
Content-Type: text/plain; charset="UTF-8"

Hello Grace,

See https://n8n.io/docs, www.example.com/a. or help@example.com (@ada_l).
"Tom & Jerry" <tag> caf\u00e9 \u2013 5 \u20ac \u4e2d \ud83d\ude00
`,
	alternative: `From: Ada <ada@example.com>
To: grace@example.com
Subject: A long subject
 folded onto a second line
Date: Fri, 2 Jan 2026 08:30:00 -0500
Content-Type: multipart/alternative; boundary="b1"

--b1
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: quoted-printable

Caf=C3=A9 opens at 9 =E2=80=93 don=E2=80=99t be l=
ate.
--b1
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: quoted-printable

<div>Caf=C3=A9 opens at 9</div>
--b1--
`,
	mixed: `From: billing@example.com
To: Ada <ada@example.com>
Subject: Invoice
Date: Sat, 3 Jan 2026 12:00:00 +0100
Content-Type: multipart/mixed; boundary="outer"

--outer
Content-Type: multipart/related; boundary="inner"

--inner
Content-Type: text/html; charset=utf-8

<p>Logo: <img src="cid:logo@x"></p>
--inner
Content-Type: image/png
Content-ID: <logo@x>
Content-Transfer-Encoding: base64

${b64('PNG')}
--inner--
--outer
Content-Type: text/plain; charset=windows-1252
Content-Transfer-Encoding: quoted-printable

=93Smart=94 quotes
--outer
Content-Type: application/pdf; name="invoice.pdf"
Content-Disposition: attachment; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf
Content-Transfer-Encoding: base64

${b64('%PDF-1.4')}
--outer--
`,
	htmlOnly: `From: =?ISO-8859-1?Q?J=F6rg?= <joerg@example.de>
Subject: =?ISO-8859-1?Q?Gr=FC=DFe?=
Date: Sun, 4 Jan 2026 07:00:00 +0000
Content-Type: text/html; charset=utf-8

<html><head><style>p{}</style></head><body><h1>News</h1><p>Read <a href="https://n8n.io/blog">our blog</a>.</p><ul><li>One</li><li>Two</li></ul><br>Caf&eacute;&nbsp;bye</body></html>
`,
	flowed: `From: ada@example.com
Subject:
Content-Type: text/plain; charset=utf-8; format=flowed; delsp=yes

This line was  
wrapped.
`,
};

/** The item that the v2 node emits with `simple: false`. */
async function legacyFull(message: IDataObject) {
	const legacy = { getNodeParameter: () => false };
	const { json } = await parseRawEmail.call(
		legacy as unknown as IExecuteFunctions,
		message,
		'attachment_',
	);
	return json;
}

const rawMessage = (id: string, source: string) => ({
	id,
	threadId: `t-${id}`,
	labelIds: ['INBOX'],
	sizeEstimate: 2048,
	snippet: 'Snippet',
	raw: Buffer.from(crlf(source)).toString('base64url'),
});

describe('gmail.message.get with simplify off', () => {
	it.each(Object.entries(RAW_MESSAGES))(
		'parses the %s message like the v2 node',
		async (id, source) => {
			const message = rawMessage(id, source);
			const { items, calls, hints } = run(
				getGmailMessage,
				{ messageId: id, simplify: false },
				() => message,
			);
			expect(await items).toEqual([await legacyFull(message)]);
			expect(calls.map(({ options }) => [options.url, options.qs])).toEqual([
				[`${GMAIL}/messages/${id}`, { format: 'raw' }],
			]);
			expect(hints).toEqual([]);
		},
	);

	it('names the message that has no raw content', async () => {
		const { items } = run(getGmailMessage, { messageId: 'm9', simplify: false }, () =>
			metadata('m9'),
		);
		await expect(items).rejects.toThrow('Gmail returned message m9 without its raw content');
	});
});

describe('gmail.message.getAll with simplify off', () => {
	it('parses each message and skips the label lookup', async () => {
		const sources = Object.entries(RAW_MESSAGES);
		const { items, calls } = run(
			getManyGmailMessages,
			{ paging: { mode: 'limit', max: 2 }, simplify: false },
			(options) =>
				options.url === `${GMAIL}/messages`
					? { messages: sources.slice(0, 2).map(([id]) => ({ id })) }
					: rawMessage(...(sources.find(([id]) => options.url.endsWith(`/${id}`)) ?? sources[0])),
		);
		expect(await items).toEqual(
			await Promise.all(
				sources.slice(0, 2).map(async ([id, source]) => await legacyFull(rawMessage(id, source))),
			),
		);
		expect(calls.map(({ options }) => options.url)).toEqual([
			`${GMAIL}/messages`,
			`${GMAIL}/messages/plain`,
			`${GMAIL}/messages/alternative`,
		]);
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

	it('keeps a comma inside a quoted name, quotes a sender name, and folds a long subject', async () => {
		const subject = `Grüße ${'ü'.repeat(60)} 😀`;
		const { items, calls } = run(
			sendGmailMessage,
			{
				to: '"Doe, John" <j@x.io>, ada@x.io',
				subject,
				body: { format: 'text', text: 'x' },
				senderName: 'Ops, "Night" Team',
				appendAttribution: false,
			},
			(options) =>
				options.url.endsWith('/profile')
					? { emailAddress: 'ops@x.io' }
					: { id: 's1', threadId: 't1' },
		);
		await items;
		const body = calls[1]?.options.body as { raw: string };
		const head = Buffer.from(body.raw, 'base64url').toString().split('\r\n\r\n')[0] ?? '';
		expect(head).toContain('From: "Ops, \\"Night\\" Team" <ops@x.io>');
		expect(head).toContain('To: "Doe, John" <j@x.io>, ada@x.io');
		const subjectLines = /Subject: ([^]*?)\r\nMIME/.exec(head)?.[1]?.split('\r\n ') ?? [];
		expect(subjectLines.length).toBeGreaterThan(1);
		expect(subjectLines.every((word) => word.length <= 75)).toBe(true);
		const decoded = subjectLines
			.map((word) => Buffer.from(word.slice(10, -2), 'base64').toString())
			.join('');
		expect(decoded).toBe(subject);
	});

	it('streams an attachment as base64 lines across any chunk boundary', async () => {
		const bytes = Buffer.from(Array.from({ length: 300 }, (_, index) => (index * 13) % 256));
		const sizes = [1, 56, 58, 2, 114, 69];
		const file = {
			meta: { mimeType: 'image/png\r\nX-Extra: 1', fileName: 'Grüße "1".png' },
			async *read() {
				yield* sizes.map((size, index) => {
					const start = sizes.slice(0, index).reduce((sum, value) => sum + value, 0);
					return bytes.subarray(start, start + size);
				});
			},
		};
		const parts: string[] = [];
		for await (const part of mixedMessage(
			[['To', 'ada@x.io']],
			{ type: 'text/plain', content: 'Hi' },
			[file],
		)) {
			parts.push(part);
		}
		const [head = '', text = '', attachment = '', end] = parts.join('').split('\r\n--=_n8n_mixed');
		expect(head).toBe('To: ada@x.io\r\nContent-Type: multipart/mixed; boundary="=_n8n_mixed"\r\n');
		expect(text).toContain('Content-Type: text/plain');
		expect(end).toBe('--\r\n');
		const [fileHead = '', lines = ''] = attachment.split('\r\n\r\n');
		expect(fileHead).toContain("filename*=UTF-8''Gr%C3%BC%C3%9Fe%20%221%22.png");
		expect(fileHead).toContain('Content-Type: image/png X-Extra: 1;');
		expect(fileHead).not.toMatch(/^X-Extra:/m);
		const encoded = lines.split('\r\n').filter(Boolean);
		expect(encoded.every((line) => line.length <= 76)).toBe(true);
		expect(Buffer.from(encoded.join(''), 'base64')).toEqual(bytes);
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

	it.each(['SAFETY', 'MAX_TOKENS'])(
		'fails when no candidate has text and the finish reason is %s',
		async (finishReason) => {
			const { items } = run(
				messageGemini,
				{ model: 'gemini-2.5-flash', messages: [{ content: 'x' }] },
				() => ({ candidates: [{ content: { role: 'model' }, finishReason, index: 0 }] }),
			);
			await expect(items).rejects.toThrow(`Gemini returned no text: ${finishReason}`);
		},
	);

	it('leaves thought summaries out of the merged text', async () => {
		const candidate = {
			content: { parts: [{ text: 'think', thought: true }, { text: 'answer' }], role: 'model' },
			finishReason: 'STOP',
		};
		const { items } = run(
			messageGemini,
			{ model: 'gemini-2.5-flash', messages: [{ content: 'x' }] },
			() => ({ candidates: [candidate] }),
		);
		expect(await items).toEqual([{ ...candidate, mergedResponse: 'answer' }]);
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
