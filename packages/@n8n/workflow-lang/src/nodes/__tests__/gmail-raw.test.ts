/**
 * The compiled Gmail node without "simplify" (`nodes/gmail.ts`, `parseRawEmail`) against
 * the real `mailparser` of `n8n-nodes-base`, on messages that this file writes from parts.
 *
 * For each message, the library node must give the item that `parseRawEmail` of the v1
 * node gives, or end with the error that sends the node to the fallback host. A message of
 * the list `native` must give the item. The reference runner and the bytecode VM must agree.
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { RUNS_IN_HOST } from '../../convert/helpers.ts';
import { DEFAULT_NODE_PACKAGES } from '../../credentials/types.ts';
import type { Fixture } from '../../reference/runner.ts';
import { jsonCopy, runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';

type Json = Record<string, unknown>;

interface ParsedMail {
	headerLines: Array<{ key: string; line: string }>;
	date?: Date;
	[key: string]: unknown;
}

const req = createRequire(join(DEFAULT_NODE_PACKAGES[0], 'package.json'));
const { simpleParser } = req('mailparser') as {
	simpleParser: (input: string) => Promise<ParsedMail>;
};

const NODE = 'Gmail';

/** parseRawEmail of the v1 node (GenericFunctions.ts), without the download of attachments. */
async function v1Item(message: Json): Promise<unknown> {
	const text = Buffer.from(String(message.raw), 'base64').toString('utf8');
	const parsed = await simpleParser(text);
	const headers: Json = {};
	for (const header of parsed.headerLines) headers[header.key] = header.line;
	const base: Json = {};
	for (const key of ['id', 'threadId', 'labelIds', 'sizeEstimate']) base[key] = message[key];
	return jsonCopy(
		Object.assign({}, base, parsed, {
			headers,
			headerLines: undefined,
			attachments: undefined,
			date: parsed.date ? parsed.date.toISOString() : parsed.date,
		}),
	);
}

function source(operation: string): string {
	const parameters =
		operation === 'get'
			? { resource: 'message', operation, messageId: 'm1', simple: false, options: {} }
			: { resource: 'message', operation, limit: 2, simple: false, filters: {}, options: {} };
	return `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'gmail-raw' })],
	credentials: { c: { type: 'gmailOAuth2' } },
	async run(ctx) {
		return await ctx.node({
			name: ${JSON.stringify(NODE)},
			type: 'n8n-nodes-base.gmail',
			typeVersion: 2.2,
			parameters: ${JSON.stringify(parameters)},
			credential: 'c',
		});
	},
});
`;
}

const b64 = (text: string): string => Buffer.from(text, 'utf8').toString('base64');
const b64Lines = (text: string, charset: BufferEncoding = 'utf8'): string =>
	(
		Buffer.from(text, charset)
			.toString('base64')
			.match(/.{1,76}/g) ?? []
	).join('\r\n');

function mail(headers: string[], body: string, eol = '\r\n'): string {
	return `${headers.join(eol)}${eol}${eol}${body}`;
}

function multipart(boundary: string, parts: string[], preamble = '', epilogue = ''): string {
	const list = parts.map((part) => `--${boundary}\r\n${part}\r\n`).join('');
	return `${preamble}${list}--${boundary}--\r\n${epilogue}`;
}

const HEAD = [
	'From: Ada Sender <ada@example.com>',
	'To: bob@example.org',
	'Subject: A plain note',
	'Date: Tue, 05 Nov 2024 10:15:00 +0100',
	'Message-ID: <note-1@example.com>',
	'MIME-Version: 1.0',
];

const TEXT =
	'Hello Bob,\r\n\r\nThe report is ready & waiting <for you>.\r\nBye   \r\n\r\n\r\nAda\r\n';
const HTML = '<html><body><p>Hello <b>Bob</b> &amp; all, café</p></body></html>\r\n';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3, 250, 251]);

const textPart = (text = TEXT): string => mail(['Content-Type: text/plain; charset=utf-8'], text);
const htmlPart = (html = HTML): string =>
	mail(['Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: 8bit'], html);
const filePart = (name: string, extra: string[] = []): string =>
	mail(
		[
			`Content-Type: image/png; name="${name}"`,
			`Content-Disposition: attachment; filename="${name}"`,
			'Content-Transfer-Encoding: base64',
			...extra,
		],
		(PNG.toString('base64').match(/.{1,8}/g) ?? []).join('\r\n'),
	);

/** Messages that the library node must parse itself. */
const native: Array<[string, string]> = [
	['text, no content type', mail(HEAD, TEXT)],
	['text with line feeds only', mail(HEAD, TEXT.replaceAll('\r\n', '\n'), '\n')],
	['text without a line break at the end', mail(HEAD, 'One line')],
	['text with an empty body', mail(HEAD, '')],
	[
		'text in base64',
		mail(
			[...HEAD, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64'],
			b64Lines(TEXT),
		),
	],
	[
		'text in quoted-printable',
		mail(
			[
				...HEAD,
				'Content-Type: text/plain; charset=us-ascii',
				'Content-Transfer-Encoding: quoted-printable',
			],
			'A long line that the sender broke =\r\nin two, with 2 + 2 =3D 4 and a tab=09here   \r\nEnd=20\r\n',
		),
	],
	[
		'headers: folded lines, repeated keys, encoded words, lists of addresses',
		mail(
			[
				'Received: from a.example.com by b.example.org;',
				'\tTue, 05 Nov 2024 09:00:00 +0000',
				'Received: from c.example.com by a.example.com; Tue, 05 Nov 2024 08:59:00 +0000',
				'From: =?UTF-8?B?QWRhIMOJY2xhaXI=?= <ada@example.com>',
				'To: "Doe, John" <john@example.org>, plain@example.org,',
				' Jane Q. Roe <jane.roe+tag@example.org>, <bare@example.org>',
				'Cc: =?ISO-8859-1?Q?Ren=E9_Caf=E9?= <rene@example.org>',
				'Bcc: =?windows-1252?Q?=80uro_=93Quoted=94?= <euro@example.org>',
				'Reply-To: "Ada & Co\'s <Team>" <reply@example.com>',
				'Subject: =?UTF-8?Q?Caf=C3=A9_?= =?UTF-8?Q?menu?= and =?utf-8?B?8J+YgA==?= =?iso-8859-1?Q?=E9t=E9?=',
				'References: <a@example.com> <b@example.com>',
				'\t<c@example.com>',
				'In-Reply-To: <c@example.com>',
				'Message-ID: no-brackets@example.com',
				'Date: 5 Nov 2024 10:15 GMT',
				'X-Empty:',
			],
			'Thanks\r\n',
		),
	],
	[
		'multipart/alternative: text and HTML',
		mail(
			[...HEAD, 'Content-Type: multipart/alternative; boundary="alt-1"'],
			multipart('alt-1', [textPart(), htmlPart()], 'This is a preamble.\r\n', 'An epilogue.\r\n'),
		),
	],
	[
		'multipart/alternative: text in quoted-printable and HTML in base64, ISO-8859-1',
		mail(
			[...HEAD, 'Content-Type: multipart/alternative; boundary=alt2'],
			multipart('alt2', [
				mail(
					[
						'Content-Type: text/plain; charset=iso-8859-1',
						'Content-Transfer-Encoding: quoted-printable',
					],
					'Plain words only=\r\n here\r\n',
				),
				mail(
					['Content-Type: text/html; charset=ISO-8859-1', 'Content-Transfer-Encoding: base64'],
					b64Lines('<p>Café crème</p>', 'latin1'),
				),
			]),
		),
	],
	[
		'multipart/alternative: HTML in quoted-printable, Windows-1252',
		mail(
			[...HEAD, 'Content-Type: multipart/alternative; boundary=alt3'],
			multipart('alt3', [
				textPart('Short text\r\n'),
				mail(
					[
						'Content-Type: text/html; charset=windows-1252',
						'Content-Transfer-Encoding: quoted-printable',
					],
					'<p>=80 5 =96 =93quoted=94 caf=E9</p>\r\n',
				),
			]),
		),
	],
	[
		'multipart/mixed: text and two attachments',
		mail(
			[...HEAD, 'Content-Type: multipart/mixed; boundary="mix-1"'],
			multipart('mix-1', [textPart(), filePart('one.png'), filePart('two.png')]),
		),
	],
	[
		'multipart/mixed: HTML only and an attachment',
		mail(
			[...HEAD, 'Content-Type: multipart/mixed; boundary="mix-2"'],
			multipart('mix-2', [htmlPart(), filePart('one.png')]),
		),
	],
	[
		'multipart/mixed with a nested multipart/alternative and an attachment',
		mail(
			[...HEAD, 'Content-Type: multipart/mixed; boundary="outer"'],
			multipart('outer', [
				mail(
					['Content-Type: multipart/alternative; boundary="inner"'],
					multipart('inner', [textPart(), htmlPart()]),
				),
				filePart('one.png'),
				mail(
					['Content-Type: text/plain', 'Content-Disposition: attachment; filename="notes.txt"'],
					'An attached text with a link: https://example.com\r\n',
				),
			]),
		),
	],
	[
		'multipart/related in an alternative, the image is not used in the HTML',
		mail(
			[...HEAD, 'Content-Type: multipart/alternative; boundary="alt-4"'],
			multipart('alt-4', [
				textPart('Short text\r\n'),
				mail(
					['Content-Type: multipart/related; boundary="rel-4"'],
					multipart('rel-4', [htmlPart(), filePart('logo.png', ['Content-ID: <logo>'])]),
				),
			]),
		),
	],
	[
		'multipart/mixed: two text parts',
		mail(
			[...HEAD, 'Content-Type: multipart/mixed; boundary="mix-3"'],
			multipart('mix-3', [textPart('First part\r\n'), textPart('Second part\r\n\r\n')]),
		),
	],
	[
		'multipart/mixed: a text part and an HTML part of an alternative',
		mail(
			[...HEAD, 'Content-Type: multipart/mixed; boundary="mix-4"'],
			multipart('mix-4', [
				textPart('Before\ttab\r\n'),
				mail(
					['Content-Type: multipart/alternative; boundary="alt-5"'],
					multipart('alt-5', [textPart('Inner text\r\n'), htmlPart()]),
				),
			]),
		),
	],
];

/** Messages that the library node may leave to the fallback host. Each result must be exact or the host error. */
const either: Array<[string, string]> = [
	['HTML only', mail([...HEAD, 'Content-Type: text/html; charset=utf-8'], HTML)],
	['text with a link', mail(HEAD, 'See https://example.com/a?b=1 now\r\n')],
	['text with an address', mail(HEAD, 'Write to carol@example.com\r\n')],
	['text with a host name', mail(HEAD, 'Open example.com today\r\n')],
	['text with a number', mail(HEAD, 'It costs 3.50 today.\r\n')],
	[
		'text that is not ASCII',
		mail([...HEAD, 'Content-Type: text/plain; charset=utf-8'], 'Café\r\n'),
	],
	[
		'text in ISO-8859-1 as 8bit bytes',
		mail([...HEAD, 'Content-Type: text/plain; charset=iso-8859-1'], 'Café\r\n'),
	],
	[
		'a charset of another family',
		mail([...HEAD, 'Content-Type: text/plain; charset=koi8-r'], 'Text\r\n'),
	],
	['flowed text', mail([...HEAD, 'Content-Type: text/plain; format=flowed'], 'Soft \r\nbreak\r\n')],
	[
		'a date with a zone name',
		mail([...HEAD.slice(0, 3), 'Date: Tue, 05 Nov 2024 10:15:00 EST'], 'Hi\r\n'),
	],
	['a date that is no date', mail([...HEAD.slice(0, 3), 'Date: yesterday'], 'Hi\r\n')],
	[
		'a date with a comment',
		mail([...HEAD.slice(0, 3), 'Date: Tue, 5 Nov 2024 10:15:00 -0800 (PST)'], 'Hi\r\n'),
	],
	['an address group', mail(['To: Team: a@example.com, b@example.com;', 'Subject: x'], 'Hi\r\n')],
	['an address with a comment', mail(['To: a@example.com (Ann)', 'Subject: x'], 'Hi\r\n')],
	[
		'a quoted name with an escape',
		mail(['To: "Ann \\"A\\" B" <a@example.com>', 'Subject: x'], 'Hi\r\n'),
	],
	[
		'a name with two spaces',
		mail(['To: Ann   B <a@example.com>, "C  D" <c@example.com>'], 'Hi\r\n'),
	],
	['no headers', mail([], 'Hi\r\n')],
	['headers only', 'Subject: x\r\nTo: a@example.com'],
	['a header without a colon', mail(['Subject: x', 'Broken line'], 'Hi\r\n')],
	[
		'an empty subject and empty ids',
		mail(['Subject:', 'Message-ID:', 'References:', 'To:'], 'Hi\r\n'),
	],
	[
		'two To headers',
		mail(['To: a@example.com', 'To: b@example.com', 'From: c@example.com'], 'Hi\r\n'),
	],
	[
		'two From and Subject headers',
		mail(['From: a@example.com', 'From: b@example.com', 'Subject: 1', 'Subject: 2'], 'Hi\r\n'),
	],
	['an encoded word in another charset', mail(['Subject: =?koi8-r?B?8NLJ18XU?='], 'Hi\r\n')],
	['an encoded word that is not closed', mail(['Subject: =?UTF-8?Q?abc'], 'Hi\r\n')],
	[
		'encoded words of two kinds',
		mail(['Subject: =?UTF-8?Q?a_b?= =?UTF-8?B?Yw==?=  tail =?UTF-8?Q?=41?='], 'Hi\r\n'),
	],
	[
		'a subject with a tab and spaces',
		mail(['Subject:  A\t B  ', 'To:   a@example.com  '], 'Hi\r\n'),
	],
	[
		'an image by content id',
		mail(
			[...HEAD, 'Content-Type: multipart/related; boundary="rel"'],
			multipart('rel', [
				htmlPart('<p><img src="cid:logo"></p>\r\n'),
				filePart('logo.png', ['Content-ID: <logo>']),
			]),
		),
	],
	[
		'a multipart that does not end',
		mail(
			[...HEAD, 'Content-Type: multipart/mixed; boundary="open"'],
			`--open\r\n${textPart()}\r\n`,
		),
	],
	[
		'a multipart without parts',
		mail([...HEAD, 'Content-Type: multipart/mixed; boundary="none"'], 'Only text\r\n'),
	],
	[
		'a boundary of the outer multipart inside the inner one',
		mail(
			[...HEAD, 'Content-Type: multipart/mixed; boundary="outer"'],
			multipart('outer', [
				mail(
					['Content-Type: multipart/alternative; boundary="inner"'],
					`--inner\r\n${textPart()}\r\n`,
				),
				filePart('one.png'),
			]),
		),
	],
	[
		'an embedded message',
		mail(
			[...HEAD, 'Content-Type: multipart/mixed; boundary="fw"'],
			multipart('fw', [
				textPart('See below\r\n'),
				mail(['Content-Type: message/rfc822', 'Content-Disposition: inline'], mail(HEAD, TEXT)),
			]),
		),
	],
	[
		'an attached message',
		mail(
			[...HEAD, 'Content-Type: multipart/mixed; boundary="fw2"'],
			multipart('fw2', [
				textPart('See below\r\n'),
				mail(['Content-Type: message/rfc822'], mail(HEAD, TEXT)),
			]),
		),
	],
	[
		'quoted-printable with odd forms',
		mail(
			[...HEAD, 'Content-Transfer-Encoding: quoted-printable'],
			'A =ZZ b =4 c == d =\r\n=\r\ne 100% =e9\r\n',
		),
	],
	[
		'base64 text with a break in a group',
		mail([...HEAD, 'Content-Transfer-Encoding: base64'], 'SGVsbG8\r\n=\r\n'),
	],
	['text with a form feed', mail(HEAD, 'A\fB\r\n')],
	[
		'a part without a body',
		mail(
			[...HEAD, 'Content-Type: multipart/mixed; boundary="e1"'],
			'--e1\r\nContent-Type: text/plain\r\n\r\n--e1\r\nContent-Type: text/plain\r\n\r\nHi\r\n--e1--',
		),
	],
	[
		'a part without a blank line after its headers',
		mail(
			[...HEAD, 'Content-Type: multipart/mixed; boundary="e2"'],
			'--e2\r\nContent-Type: text/plain\r\n--e2\r\n\r\nHi\r\n--e2--\r\n',
		),
	],
	[
		'text with a part type in capitals',
		mail([...HEAD, 'Content-Type: TEXT/PLAIN; CHARSET=US-ASCII'], 'Hi\r\n'),
	],
	['an unknown transfer encoding', mail([...HEAD, 'Content-Transfer-Encoding: x-token'], 'Hi\r\n')],
	['text with blank lines around it', mail(HEAD, '\r\n\r\n  Hi  \r\n \r\n\r\n\r\n there \r\n\r\n')],
];

const modules = new Map<string, ReturnType<typeof decodeModule>>();

function moduleOf(text: string): ReturnType<typeof decodeModule> {
	let module = modules.get(text);
	if (module === undefined) {
		const compiled = compile(text);
		expect(compiled.diagnostics).toEqual([]);
		module = decodeModule(compiled.module ?? new Uint8Array());
		modules.set(text, module);
	}
	return module;
}

/** Runs the library node on the messages. `quick` runs only the bytecode VM. */
async function library(
	operation: string,
	raws: string[],
	quick = false,
): Promise<{ ok: boolean; result: unknown }> {
	const message = (raw: string, n: number): Json => ({
		id: `m${n + 1}`,
		threadId: `t${n + 1}`,
		labelIds: ['INBOX'],
		snippet: 'A snippet',
		sizeEstimate: raw.length,
		raw: b64(raw).replaceAll('+', '-').replaceAll('/', '_'),
	});
	const answers = raws.map((raw, n) => ({ status: 200, headers: {}, body: message(raw, n) }));
	const list = {
		status: 200,
		headers: {},
		body: { messages: raws.map((_, n) => ({ id: `m${n + 1}` })) },
	};
	const fixture: Fixture = {
		trigger: { body: {} },
		now: 1_731_400_000_000,
		seed: 1,
		effects: { [NODE]: operation === 'get' ? answers : [list, ...answers] },
	};
	const text = source(operation);
	const module = moduleOf(text);
	const bytecode = runModule(module, fixture);
	const reference = quick ? bytecode : await runReference(text, fixture);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	if (process.env.GMAIL_RAW_DEBUG && reference.status !== 'ok') {
		console.log(JSON.stringify(reference).match(/parses this message: [^(]*/)?.[0]);
	}
	const requests = reference.effects.map((effect) => jsonCopy(effect.args)) as Json[];
	const wanted = operation === 'get' ? raws.length : raws.length + 1;
	expect(requests.length).toBeLessThanOrEqual(wanted);
	for (const request of requests.slice(operation === 'get' ? 0 : 1)) {
		expect(request.qs).toMatchObject({ format: 'raw' });
	}
	if (reference.status === 'ok') return { ok: true, result: reference.result };
	expect(JSON.stringify(reference)).toContain(RUNS_IN_HOST);
	return { ok: false, result: undefined };
}

const messageOf = (raw: string, n = 0): Json => ({
	id: `m${n + 1}`,
	threadId: `t${n + 1}`,
	labelIds: ['INBOX'],
	sizeEstimate: raw.length,
	raw: b64(raw),
});

describe('Gmail without "simplify": the compiled parser against mailparser', () => {
	it.each(native)('parses: %s', async (_name, raw) => {
		const got = await library('get', [raw]);
		expect(got.ok).toBe(true);
		expect(got.result).toEqual([await v1Item(messageOf(raw))]);
		expect(JSON.stringify(got.result)).toBe(JSON.stringify([await v1Item(messageOf(raw))]));
	});

	it.each(either)('is exact or runs in the host: %s', async (_name, raw) => {
		const got = await library('get', [raw]);
		if (got.ok) expect(got.result).toEqual([await v1Item(messageOf(raw))]);
	});

	it('is exact or runs in the host for messages made from parts', async () => {
		const bodies = [
			TEXT,
			'Hi\r\n',
			'',
			'Tabs\there\r\n\r\n\r\n\r\nEnd',
			HTML,
			'\r\n',
			'\r\n\r\n',
			'\r\nA = B\r\n\r\n--\r\n--b\r\n',
		];
		const encodings = ['', '7bit', 'base64', 'quoted-printable'];
		const types = [
			'text/plain; charset=utf-8',
			'text/plain',
			'text/html; charset=utf-8',
			'TEXT/HTML',
		];
		const shapes = ['single', 'alternative', 'mixed', 'nested'];
		let parsed = 0;
		let count = 0;
		for (const shape of shapes) {
			for (const [b, body] of bodies.entries()) {
				for (const encoding of encodings) {
					for (const type of types) {
						const encoded =
							encoding === 'base64'
								? b64Lines(body)
								: encoding === 'quoted-printable'
									? body.replaceAll('=', '=3D').replaceAll('é', '=C3=A9')
									: body;
						const lines = [`Content-Type: ${type}`];
						if (encoding !== '') lines.push(`Content-Transfer-Encoding: ${encoding}`);
						const part = mail(lines, encoded);
						const other = bodies[(b + 1) % bodies.length];
						let raw = mail([...HEAD, ...lines], encoded);
						if (shape === 'alternative') {
							raw = mail(
								[...HEAD, 'Content-Type: multipart/alternative; boundary=b1'],
								multipart('b1', [textPart(other), part]),
							);
						} else if (shape === 'mixed') {
							raw = mail(
								[...HEAD, 'Content-Type: multipart/mixed; boundary=b1'],
								multipart('b1', [part, filePart('f.png'), htmlPart(other)]),
							);
						} else if (shape === 'nested') {
							raw = mail(
								[...HEAD, 'Content-Type: multipart/mixed; boundary=b1'],
								multipart('b1', [
									mail(
										['Content-Type: multipart/alternative; boundary=b2'],
										multipart('b2', [part, htmlPart(other)]),
									),
									filePart('f.png'),
								]),
							);
						}
						count++;
						const got = await library('get', [raw], true);
						if (!got.ok) continue;
						parsed++;
						expect(got.result, raw).toEqual([await v1Item(messageOf(raw))]);
					}
				}
			}
		}
		expect(count).toBe(512);
		expect(parsed).toBeGreaterThan(100);
	}, 120_000);

	it('getAll gives one item for each message', async () => {
		const raws = [native[0][1], native[7][1]];
		const got = await library('getAll', raws);
		expect(got.ok).toBe(true);
		expect(got.result).toEqual([
			await v1Item(messageOf(raws[0], 0)),
			await v1Item(messageOf(raws[1], 1)),
		]);
	});
});
