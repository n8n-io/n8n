import { GmailOAuth2Api } from 'n8n-nodes-base/dist/credentials/GmailOAuth2Api.credentials';
import { GoogleOAuth2Api } from 'n8n-nodes-base/dist/credentials/GoogleOAuth2Api.credentials';
import { OAuth2Api } from 'n8n-nodes-base/dist/credentials/OAuth2Api.credentials';
import { Gmail } from 'n8n-nodes-base/dist/nodes/Google/Gmail/Gmail.node';

import { getGmailMessage } from '../../nodes/gmail/actions/message.get';
import { getManyGmailMessages } from '../../nodes/gmail/actions/message.get-all';
import { sendGmailMessage } from '../../nodes/gmail/actions/message.send';
import {
	actionNode,
	compareRuns,
	requireBuilt,
	runNode,
	type AllowedDifference,
	type ParityCase,
	type ParityRun,
	type Route,
} from './harness';

const API = 'https://www.googleapis.com/gmail/v1/users/me';

const credential: ParityCase['credential'] = {
	data: {
		grantType: 'authorizationCode',
		clientId: 'client',
		clientSecret: 'secret',
		accessTokenUrl: 'https://oauth2.googleapis.com/token',
		authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
		authentication: 'header',
		oauthTokenData: { access_token: 'token-parity', token_type: 'Bearer' },
	},
	types: [new GmailOAuth2Api(), new GoogleOAuth2Api(), new OAuth2Api()],
};

const legacyNode = (parameters: Record<string, unknown>) => ({
	nodeType: new Gmail(),
	type: 'n8n-nodes-base.gmail',
	typeVersion: 2.2,
	credential: 'gmailOAuth2',
	parameters: { authentication: 'oAuth2', resource: 'message', ...parameters },
});

const labels: Route = {
	method: 'GET',
	url: `${API}/labels`,
	json: {
		labels: [
			{ id: 'INBOX', name: 'INBOX', type: 'system' },
			{ id: 'UNREAD', name: 'UNREAD', type: 'system' },
			{ id: 'Label_1', name: 'Work', type: 'user' },
		],
	},
};

const message = (id: string): Route => ({
	method: 'GET',
	url: `${API}/messages/${id}`,
	json: {
		id,
		threadId: `thread-${id}`,
		labelIds: ['INBOX', 'UNREAD'],
		snippet: `Snippet ${id}`,
		sizeEstimate: 1024,
		historyId: '981',
		internalDate: '1767225600000',
		payload: {
			partId: '',
			mimeType: 'text/plain',
			filename: '',
			headers: [
				{ name: 'From', value: 'Ada <ada@example.com>' },
				{ name: 'To', value: 'me@example.com' },
				{ name: 'Subject', value: `Hello ${id}` },
			],
			body: { size: 12 },
		},
	},
});

describe('gmail.message.send parity with Gmail v2.2 message send', () => {
	const parityCase: ParityCase = {
		credential,
		input: [{ to: 'grace@example.com' }, { to: 'linus@example.com' }],
		routes: [
			{ method: 'GET', url: `${API}/profile`, json: { emailAddress: 'me@example.com' } },
			{
				method: 'POST',
				url: `${API}/messages/send`,
				json: { id: 'sent-1', threadId: 'thread-sent-1', labelIds: ['SENT'] },
			},
		],
	};

	interface ParsedMail {
		readonly headers: Map<string, unknown>;
		readonly text?: string;
		readonly html?: string | false;
	}
	// Reuse the parser the legacy node uses for raw mail; it lives in nodes-base.
	const { simpleParser } = requireBuilt('nodes-base/node_modules/mailparser') as {
		simpleParser(source: Buffer): Promise<ParsedMail>;
	};
	const MAIL_HEADERS = ['from', 'to', 'cc', 'bcc', 'reply-to', 'subject', 'content-type'];

	/**
	 * The raw MIME text holds a random boundary, ID, and date; compare its parsed fields. A
	 * trailing line break of the text body is not significant.
	 */
	const parseMail = async (run: ParityRun): Promise<ParityRun> => {
		const entries = await Promise.all(
			Object.entries(run.requests).map(async ([key, request]) => {
				const raw = (request.body as { raw?: string } | undefined)?.raw;
				if (raw === undefined) return [key, request] as const;
				const mail = await simpleParser(Buffer.from(raw, 'base64url'));
				const headers = Object.fromEntries(
					MAIL_HEADERS.flatMap((name) => {
						const value = mail.headers.get(name) as { text?: string; value?: string } | string;
						if (value === undefined) return [];
						return [[name, typeof value === 'string' ? value : (value.text ?? value.value)]];
					}),
				);
				const html = mail.html === false ? undefined : mail.html;
				return [key, { ...request, body: { headers, text: mail.text?.trimEnd(), html } }] as const;
			}),
		);
		return { ...run, requests: Object.fromEntries(entries) };
	};

	const ALLOWED: readonly AllowedDifference[] = [];

	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			legacyNode({
				operation: 'send',
				sendTo: '={{ $json.to }}',
				subject: 'Café report',
				emailType: 'text',
				message: 'The numbers are in.',
				options: { ccList: 'boss@example.com', senderName: 'Report Bot' },
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				sendGmailMessage,
				{
					to: '={{ $json.to }}',
					subject: 'Café report',
					body: { format: 'text', text: 'The numbers are in.' },
					cc: 'boss@example.com',
					senderName: 'Report Bot',
				},
				'gmailOAuth2',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(await parseMail(legacy), await parseMail(next), ALLOWED)).toEqual({
			unexplained: [],
			stale: [],
		});
	});

	it('sends the same From and Subject for a sender name with a comma and a long subject', async () => {
		const subject = `Grüße zum Quartalsbericht ${'ü'.repeat(40)} 😀 Ende`;
		const legacy = await runNode(
			legacyNode({
				operation: 'send',
				sendTo: '={{ $json.to }}',
				subject,
				emailType: 'text',
				message: 'x',
				options: { senderName: 'Doe, John', appendAttribution: false },
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				sendGmailMessage,
				{
					to: '={{ $json.to }}',
					subject,
					body: { format: 'text', text: 'x' },
					senderName: 'Doe, John',
					appendAttribution: false,
				},
				'gmailOAuth2',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(await parseMail(legacy), await parseMail(next), ALLOWED)).toEqual({
			unexplained: [],
			stale: [],
		});
	});

	// The parser derives `text` from the HTML part, so one HTML difference shows in both fields.
	const HTML_ALLOWED: readonly AllowedDifference[] = [0, 1].flatMap((index) =>
		['text', 'html'].map(
			(field): AllowedDifference => ({
				path: `requests.POST ${API}/messages/send #${index}.body.${field}`,
				kind: 'intended',
				reason:
					'The action writes the HTML attribution without indentation and without the instance ID in the campaign link.',
			}),
		),
	);

	it('sends the same HTML mail', async () => {
		const legacy = await runNode(
			legacyNode({
				operation: 'send',
				sendTo: '={{ $json.to }}',
				subject: 'Report',
				emailType: 'html',
				message: '<p>The numbers are in.</p>',
				options: { replyTo: 'team@example.com', bccList: 'audit@example.com' },
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				sendGmailMessage,
				{
					to: '={{ $json.to }}',
					subject: 'Report',
					body: { format: 'html', html: '<p>The numbers are in.</p>' },
					replyTo: 'team@example.com',
					bcc: 'audit@example.com',
				},
				'gmailOAuth2',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(await parseMail(legacy), await parseMail(next), HTML_ALLOWED)).toEqual({
			unexplained: [],
			stale: [],
		});
	});
});

describe('gmail.message.send with an attachment, against Gmail v2.2', () => {
	const UPLOAD = 'https://www.googleapis.com/upload/gmail/v1/users/me/messages/send';
	const bytes = Buffer.from(Array.from({ length: 700 }, (_, index) => (index * 7) % 256));
	const sent = { id: 'sent-2', threadId: 'thread-sent-2', labelIds: ['SENT'] };
	const parityCase: ParityCase = {
		credential,
		input: [{}],
		binary: {
			data: { data: bytes.toString('base64'), mimeType: 'image/png', fileName: 'chart.png' },
		},
		routes: [
			{ method: 'POST', url: `${API}/messages/send`, json: sent },
			{ method: 'POST', url: UPLOAD, query: { uploadType: 'media' }, json: sent },
		],
	};

	interface ParsedAttachment {
		readonly filename?: string;
		readonly contentType: string;
		readonly content: Buffer;
	}
	const { simpleParser } = requireBuilt('nodes-base/node_modules/mailparser') as {
		simpleParser(source: Buffer | string): Promise<{
			subject?: string;
			text?: string;
			to?: { text: string };
			attachments: ParsedAttachment[];
		}>;
	};
	const mailOf = async (source: Buffer | string) => {
		const mail = await simpleParser(source);
		return {
			subject: mail.subject,
			to: mail.to?.text,
			text: mail.text?.trimEnd(),
			attachments: mail.attachments.map(({ filename, contentType, content }) => ({
				filename,
				contentType,
				content: content.toString('base64'),
			})),
		};
	};

	it('sends the same mail through the media upload, not as JSON', async () => {
		const legacy = await runNode(
			legacyNode({
				operation: 'send',
				sendTo: 'grace@example.com',
				subject: 'Chart',
				emailType: 'text',
				message: 'See the chart.',
				options: {
					appendAttribution: false,
					attachmentsUi: { attachmentsBinary: [{ property: 'data' }] },
				},
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				sendGmailMessage,
				{
					to: 'grace@example.com',
					subject: 'Chart',
					body: { format: 'text', text: 'See the chart.' },
					appendAttribution: false,
					attachments: ['data'],
				},
				'gmailOAuth2',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(next.error, next.unmatched.join('; ')).toBeUndefined();

		const legacyRaw = (legacy.requests[`POST ${API}/messages/send #0`]?.body as { raw: string })
			.raw;
		const upload = next.requests[`POST ${UPLOAD} #0`];
		expect(upload?.query).toEqual({ uploadType: 'media' });
		expect(upload?.headers['content-type']).toBe('message/rfc822');
		expect(typeof upload?.body).toBe('string');

		const expected = await mailOf(Buffer.from(legacyRaw, 'base64url'));
		expect(expected.attachments).toEqual([
			{ filename: 'chart.png', contentType: 'image/png', content: bytes.toString('base64') },
		]);
		expect(await mailOf(upload?.body as string)).toEqual(expected);
		expect(next.items).toEqual(legacy.items);
	});
});

describe('gmail.message.getAll parity with Gmail v2.2 message getAll', () => {
	const parityCase: ParityCase = {
		credential,
		input: [{}],
		routes: [
			{
				method: 'GET',
				url: `${API}/messages`,
				json: {
					messages: [
						{ id: 'm1', threadId: 'thread-m1' },
						{ id: 'm2', threadId: 'thread-m2' },
					],
					nextPageToken: 'page-2',
					resultSizeEstimate: 4,
				},
			},
			message('m1'),
			message('m2'),
			labels,
		],
	};

	const ALLOWED: readonly AllowedDifference[] = ['m1', 'm2'].flatMap((id) =>
		['q', 'labelIds', 'maxResults'].map(
			(name): AllowedDifference => ({
				path: `requests.GET ${API}/messages/${id} #0.query.${name}`,
				kind: 'intended',
				reason:
					'The legacy node reuses the list query on each message request; the message endpoint ignores it.',
			}),
		),
	);

	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			legacyNode({
				operation: 'getAll',
				returnAll: false,
				limit: 2,
				simple: true,
				filters: {
					q: 'has:attachment',
					sender: 'ada@example.com',
					readStatus: 'unread',
					labelIds: ['INBOX', 'Label_1'],
				},
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				getManyGmailMessages,
				{
					filters: {
						q: 'has:attachment',
						sender: 'ada@example.com',
						readStatus: 'unread',
						labelIds: ['INBOX', 'Label_1'],
					},
					paging: { mode: 'limit', max: 2 },
				},
				'gmailOAuth2',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

describe('gmail.message.get parity with Gmail v2.2 message get', () => {
	const parityCase: ParityCase = {
		credential,
		input: [{ id: 'm1' }, { id: 'm2' }],
		routes: [message('m1'), message('m2'), labels],
	};

	const ALLOWED: readonly AllowedDifference[] = [];

	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			legacyNode({ operation: 'get', messageId: '={{ $json.id }}', simple: true }),
			parityCase,
		);
		const next = await runNode(
			actionNode(getGmailMessage, { messageId: '={{ $json.id }}' }, 'gmailOAuth2'),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

const RAW = Buffer.from(
	[
		'From: "Ada Lovelace" <ada@example.com>',
		'To: grace@example.com, "Doe, John" <john@example.com>',
		'Cc: undisclosed-recipients:;',
		'Subject: =?UTF-8?B?R3LDvMOfZSBhdXMgS8O2bG4=?=',
		'Date: Thu, 01 Jan 2026 10:00:00 +0000',
		'Message-ID: <m1@mail.example.com>',
		'References: <m0@mail.example.com>',
		'Content-Type: multipart/mixed; boundary="outer"',
		'',
		'--outer',
		'Content-Type: multipart/alternative; boundary="inner"',
		'',
		'--inner',
		'Content-Type: text/plain; charset=UTF-8',
		'Content-Transfer-Encoding: quoted-printable',
		'',
		'Caf=C3=A9 opens at 9. See https://n8n.io/docs.',
		'--inner',
		'Content-Type: text/html; charset=UTF-8',
		'',
		'<p>Caf&eacute; opens at 9.</p>',
		'--inner--',
		'--outer',
		'Content-Type: application/pdf; name="invoice.pdf"',
		'Content-Disposition: attachment; filename="invoice.pdf"',
		'Content-Transfer-Encoding: base64',
		'',
		Buffer.from('%PDF-1.4').toString('base64'),
		'--outer--',
		'',
	].join('\r\n'),
).toString('base64url');

const rawMessage = (id: string): Route => ({
	method: 'GET',
	url: `${API}/messages/${id}`,
	query: { format: 'raw' },
	json: {
		id,
		threadId: `thread-${id}`,
		labelIds: ['INBOX', 'UNREAD'],
		snippet: `Snippet ${id}`,
		sizeEstimate: 2048,
		historyId: '981',
		internalDate: '1767225600000',
		raw: RAW,
	},
});

describe('gmail.message.get with simplify off, parity with Gmail v2.2 simple off', () => {
	const parityCase: ParityCase = {
		credential,
		input: [{ id: 'm1' }, { id: 'm2' }],
		routes: [rawMessage('m1'), rawMessage('m2')],
	};

	it('sends the same requests and emits the same parsed mail', async () => {
		const legacy = await runNode(
			legacyNode({ operation: 'get', messageId: '={{ $json.id }}', simple: false }),
			parityCase,
		);
		const next = await runNode(
			actionNode(getGmailMessage, { messageId: '={{ $json.id }}', simplify: false }, 'gmailOAuth2'),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(legacy.items[0]?.json).toMatchObject({
			from: { value: [{ address: 'ada@example.com' }] },
		});
		expect(compareRuns(legacy, next, [])).toEqual({ unexplained: [], stale: [] });
	});
});

describe('gmail.message.getAll with simplify off, parity with Gmail v2.2 simple off', () => {
	const parityCase: ParityCase = {
		credential,
		input: [{}],
		routes: [
			{
				method: 'GET',
				url: `${API}/messages`,
				json: { messages: [{ id: 'm1' }, { id: 'm2' }], resultSizeEstimate: 2 },
			},
			rawMessage('m1'),
			rawMessage('m2'),
		],
	};

	const ALLOWED: readonly AllowedDifference[] = ['m1', 'm2'].map(
		(id): AllowedDifference => ({
			path: `requests.GET ${API}/messages/${id} #0.query.maxResults`,
			kind: 'intended',
			reason:
				'The legacy node reuses the list query on each message request; the message endpoint ignores it.',
		}),
	);

	it('sends the same requests and emits the same parsed mail', async () => {
		const legacy = await runNode(
			legacyNode({ operation: 'getAll', returnAll: false, limit: 2, simple: false, filters: {} }),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				getManyGmailMessages,
				{ paging: { mode: 'limit', max: 2 }, simplify: false },
				'gmailOAuth2',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});
