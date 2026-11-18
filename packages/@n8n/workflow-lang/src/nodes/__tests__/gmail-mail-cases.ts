/**
 * Cases of the Gmail node for `gmail-mail-builder.test.ts`: the messages that the node
 * writes (`message.send`, `message.reply`, `thread.reply`, `draft.create`) with the mail
 * builder of the runtime. The cases of `equivalence-cases.ts` for these operations run
 * there too.
 */
import type { EquivalenceCase } from './equivalence.ts';

export interface GmailMailCase extends EquivalenceCase {
	/** True when the runtime does not build the message: the fallback host runs the v1 node. */
	host?: boolean;
}

const gmail = {
	type: 'gmailOAuth2',
	data: { oauthTokenData: { access_token: 'fake-gmail-token', token_type: 'Bearer' } },
};
const TYPE = 'n8n-nodes-base.gmail';
const PNG =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const base64 = (text: string) => Buffer.from(text).toString('base64');
const png = { data: PNG, mimeType: 'image/png', fileName: 'dot.png' };
const csv = { data: base64('a,b\n1,2\n'), mimeType: 'text/csv', fileName: 'table one.csv' };
const untyped = { data: base64('%PDF-1.4 made up'), fileName: 'report.pdf' };
const unnamed = { data: base64('bytes'), mimeType: 'application/octet-stream' };
const files = (...names: string[]) => ({
	attachmentsUi: { attachmentsBinary: names.map((property) => ({ property })) },
});
const sent = [{ status: 200, body: { id: 'm1', threadId: 't1', labelIds: ['SENT'] } }];
const original = {
	body: {
		id: 'msg-1',
		threadId: 'thread-1',
		payload: {
			headers: [
				{ name: 'From', value: '"Lovelace, Ada" <ada@example.com>' },
				{ name: 'To', value: 'Me <me@example.com>, Bob <bob@example.com>' },
				{ name: 'Subject', value: 'Re: The plan' },
				{ name: 'Message-ID', value: '<abc@mail.example.com>' },
			],
		},
	},
};
const profile = { body: { emailAddress: 'me@example.com' } };

export const GMAIL_MAIL_CASES: GmailMailCase[] = [
	{
		name: 'send text with one file',
		type: TYPE,
		typeVersion: 2.2,
		parameters: {
			sendTo: 'ada@example.com',
			subject: 'Report',
			emailType: 'text',
			message: 'See the file.',
			options: { appendAttribution: false, ...files('data') },
		},
		items: [{ $binary: { data: png } }],
		credential: gmail,
		responses: sent,
	},
	{
		name: 'send html with the attribution and three files',
		type: TYPE,
		typeVersion: 2.1,
		parameters: {
			sendTo: 'ada@example.com, Bob <bob@example.com>',
			subject: 'Grüße mit Anhang',
			message: '<p>Hallo</p>',
			options: {
				ccList: 'c@example.com',
				bccList: 'audit@example.com',
				replyTo: 'ops@example.com',
				...files('data,table', 'report'),
			},
		},
		items: [{ $binary: { data: png, table: csv, report: untyped } }],
		credential: gmail,
		responses: sent,
	},
	{
		name: 'send a file without a name and a sender name',
		type: TYPE,
		typeVersion: 2.2,
		parameters: {
			sendTo: 'ada@example.com',
			subject: 'x',
			emailType: 'text',
			message: 'y',
			options: { appendAttribution: false, senderName: 'Ops Bot', ...files('blob') },
		},
		items: [{ $binary: { blob: unnamed } }],
		credential: gmail,
		responses: [profile, ...sent],
	},
	{
		name: 'send for two items, each with its file',
		type: TYPE,
		typeVersion: 2.2,
		parameters: {
			sendTo: '={{ $json.to }}',
			subject: '=File {{ $json.n }}',
			emailType: 'text',
			message: 'attached',
			options: { appendAttribution: false, ...files('data') },
		},
		items: [
			{ to: 'ada@example.com', n: 1, $binary: { data: png } },
			{ to: 'bob@example.com', n: 2, $binary: { data: csv } },
		],
		credential: gmail,
		responses: sent,
	},
	{
		name: 'send with an empty list of files',
		type: TYPE,
		typeVersion: 2.2,
		parameters: {
			sendTo: 'ada@example.com',
			subject: 'x',
			emailType: 'text',
			message: 'y',
			options: { appendAttribution: false, attachmentsUi: {} },
		},
		credential: gmail,
		responses: sent,
	},
	{
		name: 'send with a binary field that the item does not have',
		type: TYPE,
		typeVersion: 2.2,
		parameters: {
			sendTo: 'ada@example.com',
			subject: 'x',
			emailType: 'text',
			message: 'y',
			options: files('data, other'),
		},
		items: [{ $binary: { data: png } }],
		credential: gmail,
		responses: sent,
		expectedError: "The item has no binary field ' other' [item 0] (item 0)",
	},
	{
		name: 'send with files and an item without binary data',
		type: TYPE,
		typeVersion: 2.2,
		parameters: {
			sendTo: 'ada@example.com',
			subject: 'x',
			emailType: 'text',
			message: 'y',
			options: files('data'),
		},
		items: [{ a: 1 }],
		credential: gmail,
		responses: sent,
		expectedError:
			"This operation expects the node's input data to contain a binary file 'data', but none was found [item 0] (item 0)",
	},
	{
		name: 'send of version 2 without the attribution',
		type: TYPE,
		typeVersion: 2,
		parameters: { sendTo: 'ada@example.com', subject: 'x', message: '<p>y</p>', options: {} },
		credential: gmail,
		responses: sent,
	},
	{
		name: 'send with an option of a reply that the node does not read',
		type: TYPE,
		typeVersion: 2.1,
		parameters: {
			sendTo: 'ada@example.com',
			subject: 'x',
			emailType: 'text',
			message: 'y',
			options: { appendAttribution: false, replyToSenderOnly: true },
		},
		credential: gmail,
		responses: sent,
	},
	{
		name: 'reply with a file',
		type: TYPE,
		typeVersion: 2.2,
		parameters: {
			resource: 'message',
			operation: 'reply',
			messageId: 'msg-1',
			emailType: 'html',
			message: '<p>Thanks</p>',
			options: { senderName: 'Ops Bot', ...files('data') },
		},
		items: [{ $binary: { data: csv } }],
		credential: gmail,
		responses: [original, profile, { body: { id: 'sent-1', threadId: 'thread-1' } }],
	},
	{
		name: 'reply with the attribution option, which the node does not read',
		type: TYPE,
		typeVersion: 2.1,
		parameters: {
			resource: 'message',
			operation: 'reply',
			messageId: 'msg-1',
			emailType: 'text',
			message: 'Thanks',
			options: { appendAttribution: true },
		},
		credential: gmail,
		responses: [original, profile, { body: { id: 'sent-1', threadId: 'thread-1' } }],
	},
	{
		name: 'draft in a thread with a file',
		type: TYPE,
		typeVersion: 2.2,
		parameters: {
			resource: 'draft',
			operation: 'create',
			subject: 'Re: Offer',
			emailType: 'text',
			message: 'Draft text',
			options: { threadId: 'thread-7', sendTo: 'ada@example.com', ...files('data') },
		},
		items: [{ $binary: { data: png } }],
		credential: gmail,
		responses: [
			{
				body: {
					id: 'thread-7',
					messages: [
						{ payload: { headers: [{ name: 'Message-Id', value: '<last@mail.example.com>' }] } },
					],
				},
			},
			{ body: { id: 'r2', message: { id: 'm2', threadId: 'thread-7' } } },
		],
	},
	{
		name: 'draft without the operation parameter',
		type: TYPE,
		typeVersion: 2.1,
		parameters: {
			resource: 'draft',
			subject: 'Later',
			message: 'text',
			options: { sendTo: 'ada@example.com' },
		},
		credential: gmail,
		responses: [{ status: 200, body: { id: 'r9', message: { id: 'm9' } } }],
	},
	{
		name: 'send to an address with a local part that is not ASCII',
		type: TYPE,
		typeVersion: 2.2,
		parameters: {
			sendTo: 'jörg@example.com',
			subject: 'x',
			emailType: 'text',
			message: 'y',
			options: { appendAttribution: false },
		},
		credential: gmail,
		responses: sent,
		host: true,
	},
	{
		name: 'send a file with a name that is not ASCII',
		type: TYPE,
		typeVersion: 2.2,
		parameters: {
			sendTo: 'ada@example.com',
			subject: 'x',
			emailType: 'text',
			message: 'y',
			options: { appendAttribution: false, ...files('data') },
		},
		items: [{ $binary: { data: { ...png, fileName: 'größe.png' } } }],
		credential: gmail,
		responses: sent,
		host: true,
	},
];
