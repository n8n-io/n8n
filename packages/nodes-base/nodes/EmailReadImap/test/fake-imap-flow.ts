/* eslint-disable @typescript-eslint/naming-convention -- keys are MIME part numbers */
import { EventEmitter } from 'events';
import { Readable } from 'stream';

export interface Fixture {
	uid: number;
	source: string;
	bodyStructure: object;
	/** Decoded content per part number, as imapflow hands it back. */
	parts: Record<string, string>;
	/** What imapflow reports for each attachment part: MIME-decoded, disposition or Content-Type. */
	partFilenames?: Record<string, string>;
	partContentTypes?: Record<string, string>;
}

interface FetchQuery {
	source?: boolean;
	headers?: boolean;
	bodyStructure?: boolean;
	bodyParts?: string[];
}

const eml = (lines: string[]) => lines.join('\r\n');

export const PLAIN_ONLY: Fixture = {
	uid: 101,
	source: eml([
		'From: alice@example.com',
		'To: bob@example.com',
		'Subject: Plain only',
		'Date: Wed, 01 Jan 2020 12:00:00 +0000',
		'Message-ID: <101@example.com>',
		'MIME-Version: 1.0',
		'Content-Type: text/plain; charset=UTF-8',
		'Content-Transfer-Encoding: 7bit',
		'',
		'Plain body 101',
		'',
	]),
	bodyStructure: {
		type: 'text/plain',
		parameters: { charset: 'UTF-8' },
		encoding: '7bit',
		size: 16,
		lineCount: 1,
	},
	// imapflow rewrites a single-part message's part "1" to TEXT before it reaches the server
	parts: { '1': 'Plain body 101\r\n' },
};

export const BOTH_BODIES: Fixture = {
	uid: 102,
	source: eml([
		'From: carol@example.com',
		'To: bob@example.com',
		'Subject: Both bodies',
		'Date: Thu, 02 Jan 2020 12:00:00 +0000',
		'Message-ID: <102@example.com>',
		'MIME-Version: 1.0',
		'Content-Type: multipart/alternative; boundary="b102"',
		'',
		'--b102',
		'Content-Type: text/plain; charset=UTF-8',
		'',
		'Plain body 102',
		'--b102',
		'Content-Type: text/html; charset=UTF-8',
		'',
		'<p>HTML body 102</p>',
		'--b102--',
		'',
	]),
	bodyStructure: {
		childNodes: [
			{
				part: '1',
				type: 'text/plain',
				parameters: { charset: 'UTF-8' },
				encoding: '7bit',
				size: 16,
				lineCount: 1,
			},
			{
				part: '2',
				type: 'text/html',
				parameters: { charset: 'UTF-8' },
				encoding: '7bit',
				size: 22,
				lineCount: 1,
			},
		],
		type: 'multipart/alternative',
		parameters: { boundary: 'b102' },
	},
	parts: { '1': 'Plain body 102\r\n', '2': '<p>HTML body 102</p>\r\n' },
};

export const WITH_ATTACHMENTS: Fixture = {
	uid: 103,
	source: eml([
		'From: dave@example.com',
		'To: bob@example.com',
		'Subject: With attachments',
		'Date: Fri, 03 Jan 2020 12:00:00 +0000',
		'Message-ID: <103@example.com>',
		'MIME-Version: 1.0',
		'Content-Type: multipart/mixed; boundary="b103"',
		'',
		'--b103',
		'Content-Type: multipart/alternative; boundary="b103-alt"',
		'',
		'--b103-alt',
		'Content-Type: text/plain; charset=UTF-8',
		'',
		'Plain body 103',
		'--b103-alt',
		'Content-Type: text/html; charset=UTF-8',
		'',
		'<p>HTML body 103</p>',
		'--b103-alt--',
		'--b103',
		'Content-Type: application/pdf; name="invoice.pdf"',
		'Content-Transfer-Encoding: base64',
		'Content-Disposition: attachment; filename="invoice.pdf"',
		'',
		'aW52b2ljZQ==',
		'--b103',
		'Content-Type: image/png; name="=?UTF-8?Q?r=C3=A9sum=C3=A9.png?="',
		'Content-Transfer-Encoding: base64',
		'Content-Disposition: attachment',
		'',
		'cG5n',
		'--b103',
		'Content-Type: text/plain; charset=UTF-8',
		'Content-Disposition: attachment; filename="=?UTF-8?Q?notes=2Dcaf=C3=A9.txt?="',
		'',
		'notes',
		'--b103--',
		'',
	]),
	bodyStructure: {
		childNodes: [
			{
				childNodes: [
					{
						part: '1.1',
						type: 'text/plain',
						parameters: { charset: 'UTF-8' },
						encoding: '7bit',
						size: 16,
						lineCount: 1,
					},
					{
						part: '1.2',
						type: 'text/html',
						parameters: { charset: 'UTF-8' },
						encoding: '7bit',
						size: 22,
						lineCount: 1,
					},
				],
				part: '1',
				type: 'multipart/alternative',
				parameters: { boundary: 'b103-alt' },
			},
			{
				part: '2',
				type: 'application/pdf',
				parameters: { name: 'invoice.pdf' },
				encoding: 'base64',
				size: 14,
				disposition: 'attachment',
				dispositionParameters: { filename: 'invoice.pdf' },
			},
			{
				part: '3',
				type: 'image/png',
				parameters: { name: '=?UTF-8?Q?r=C3=A9sum=C3=A9.png?=' },
				encoding: 'base64',
				size: 6,
				disposition: 'attachment',
			},
			{
				part: '4',
				type: 'text/plain',
				parameters: { charset: 'UTF-8' },
				encoding: '7bit',
				size: 7,
				disposition: 'attachment',
				dispositionParameters: { filename: '=?UTF-8?Q?notes=2Dcaf=C3=A9.txt?=' },
			},
		],
		type: 'multipart/mixed',
		parameters: { boundary: 'b103' },
	},
	parts: {
		'1.1': 'Plain body 103\r\n',
		'1.2': '<p>HTML body 103</p>\r\n',
		'2': 'invoice',
		'3': 'png',
		'4': 'notes',
	},
	partFilenames: { '2': 'invoice.pdf', '3': 'résumé.png', '4': 'notes-café.txt' },
	partContentTypes: { '2': 'application/pdf', '3': 'image/png', '4': 'text/plain' },
};

const headerBlockOf = (fixture: Fixture) => `${fixture.source.split('\r\n\r\n')[0]}\r\n\r\n`;

export const bodyOf = (fixture: Fixture) =>
	fixture.source.split('\r\n\r\n').slice(1).join('\r\n\r\n');

/** Serves a fixture mailbox at the imapflow method level, so ImapSimple runs for real on top of it. */
export class FakeImapFlow extends EventEmitter {
	usable = true;

	readonly flagsAdded: Array<{ range: string; flags: string[] }> = [];

	constructor(private readonly mailbox: Fixture[]) {
		super();
	}

	connect = vi.fn(async () => {});

	search = vi.fn(async () => this.mailbox.map((m) => m.uid));

	fetch = vi.fn((uids: number[], query: FetchQuery) => {
		const wanted = this.mailbox.filter((m) => uids.includes(m.uid));

		return (function* () {
			for (const [index, message] of wanted.entries()) {
				const bodyParts = new Map<string, Buffer>();
				if (query.bodyParts) bodyParts.set('text', Buffer.from(bodyOf(message)));

				yield {
					seq: index + 1,
					uid: message.uid,
					flags: new Set<string>(),
					internalDate: new Date('2020-01-01T00:00:00.000Z'),
					size: message.source.length,
					...(query.source && { source: Buffer.from(message.source) }),
					...(query.headers && { headers: Buffer.from(headerBlockOf(message)) }),
					...(query.bodyStructure && { bodyStructure: message.bodyStructure }),
					bodyParts,
				};
			}
		})();
	});

	download = vi.fn(async (range: string, part: string) => {
		const content = this.mailbox.find((m) => String(m.uid) === range)?.parts[part];
		return content === undefined ? {} : { content: Readable.from([Buffer.from(content)]) };
	});

	downloadMany = vi.fn(async (range: string, parts: string[]) => {
		const message = this.mailbox.find((m) => String(m.uid) === range);

		return Object.fromEntries(
			parts.map((part) => [
				part,
				{
					meta: {
						filename: message?.partFilenames?.[part],
						contentType: message?.partContentTypes?.[part],
					},
					content: Buffer.from(message?.parts[part] ?? ''),
				},
			]),
		);
	});

	messageFlagsAdd = vi.fn(async (range: string, flags: string[]) => {
		this.flagsAdded.push({ range, flags });
		return true;
	});

	list = vi.fn(async () => []);

	mailboxOpen = vi.fn(async () => ({ exists: this.mailbox.length }));

	logout = vi.fn(async () => true);

	close = vi.fn((): void => {});
}
