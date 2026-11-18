/**
 * Cases of the Send Email node for `email-send-equivalence.test.ts`: the parameters of the
 * v1 node, the credential, the input items and the behaviour of the SMTP server.
 */
import type { SmtpBehaviour } from './smtp-server.ts';

/**
 * The credential of a case:
 * - `login`: no TLS at the start, with a user and a password;
 * - `open`: no TLS at the start, without a login;
 * - `plain`: as `login`, and the client must not use STARTTLS (`disableStartTls`);
 * - `direct`: TLS from the first byte, with a login;
 * - `closed`: a port without a server.
 */
export type EmailSendCredential = 'login' | 'open' | 'plain' | 'direct' | 'closed';

export interface EmailSendCase {
	name: string;
	/** The default is 2.1. */
	typeVersion?: number;
	parameters: Record<string, unknown>;
	/** The default is `login`. */
	credential?: EmailSendCredential;
	/** The default is a server with `AUTH PLAIN LOGIN`. */
	server?: SmtpBehaviour;
	/** The input items. The default is one empty item. */
	items?: Array<Record<string, unknown>>;
	onError?: 'continueRegularOutput' | 'continueErrorOutput';
	/** Other settings of the node: "retry on fail". */
	settings?: { retryOnFail?: boolean; maxTries?: number; waitBetweenTries?: number };
	/**
	 * True when the runtime cannot send the message as nodemailer does: the effect ends
	 * with the marker before the MAIL command, and the fallback host runs the v1 node.
	 */
	host?: boolean;
}

const PNG =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const base64 = (text: string) => Buffer.from(text).toString('base64');
const png = { data: PNG, mimeType: 'image/png', fileName: 'dot.png' };
const notes = {
	data: base64('line one\nline two\n'),
	mimeType: 'text/plain',
	fileName: 'notes.txt',
};
const unnamed = { data: base64('%PDF-1.4 made up'), mimeType: 'application/pdf' };

const mail = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
	fromEmail: 'a@x.test',
	toEmail: 'b@x.test',
	subject: 'Hi',
	emailFormat: 'text',
	text: 'body',
	options: {},
	...extra,
});
const plainText = { appendAttribution: false };
const AUTH: SmtpBehaviour = { auth: 'PLAIN LOGIN' };

export const EMAIL_SEND_CASES: EmailSendCase[] = [
	{ name: 'text with the attribution', parameters: mail() },
	{ name: 'text without the attribution', parameters: mail({ options: plainText }) },
	{
		name: 'HTML with the attribution',
		parameters: mail({ emailFormat: 'html', html: '<p>Hello <b>there</b></p>' }),
	},
	{
		name: 'the default format of version 2.1 is HTML',
		parameters: { fromEmail: 'a@x.test', toEmail: 'b@x.test', subject: 'Hi', html: '<i>x</i>' },
	},
	{
		name: 'the default format of version 2 is text, without the attribution',
		typeVersion: 2,
		parameters: { fromEmail: 'a@x.test', toEmail: 'b@x.test', subject: 'Hi', text: 'two' },
	},
	{
		name: 'version 2 with the attribution option',
		typeVersion: 2,
		parameters: mail({ options: { appendAttribution: true } }),
	},
	{
		name: 'text and HTML with the attribution',
		parameters: mail({ emailFormat: 'both', html: '<p>Hello</p>' }),
	},
	{
		name: 'text and an empty HTML: the attribution goes to the text',
		parameters: mail({ emailFormat: 'both', html: '' }),
	},
	{
		name: 'a subject and names that are not ASCII',
		parameters: mail({
			fromEmail: 'Jürgen Müller <a@x.test>',
			toEmail: '"Zoë, the Ω" <b@x.test>, 山田 <c@x.test>',
			subject: 'Grüße aus Köln: ein längerer Betreff, der über eine Zeile hinaus geht ✓',
			text: 'Schöne Grüße\nund viel Erfolg',
		}),
	},
	{
		name: 'a text that is not ASCII, as quoted-printable',
		parameters: mail({ text: 'Smörgåsbord for everyone at the office today', options: plainText }),
	},
	{
		name: 'a text that is mostly not ASCII, as base64',
		parameters: mail({ text: '日本語のメッセージです。', options: plainText }),
	},
	{
		name: 'a long line',
		parameters: mail({ text: 'word '.repeat(40), options: plainText }),
	},
	{
		name: 'lines that start with a dot',
		parameters: mail({ text: '.first\n..second\n.\nlast', options: plainText }),
	},
	{
		name: 'cc, bcc and reply-to',
		parameters: mail({
			options: {
				ccEmail: 'C One <c1@x.test>, c2@x.test',
				bccEmail: 'hidden@x.test',
				replyTo: 'Answers <reply@x.test>',
			},
		}),
	},
	{
		name: 'the same recipient in to, cc and bcc',
		parameters: mail({ options: { ccEmail: 'b@x.test', bccEmail: 'B <b@x.test>, d@x.test' } }),
	},
	{
		name: 'a list of addresses from an expression',
		parameters: mail({ toEmail: '={{ $json.to }}', subject: '={{ $json.count }}' }),
		items: [{ to: ['b@x.test', '', 'c@x.test'], count: 3 }],
	},
	{
		name: 'a subject and a text that are not texts',
		parameters: mail({ subject: '={{ $json.flag }}', text: '={{ $json.data }}' }),
		items: [{ flag: true, data: { a: 1, b: [2, 'x'] } }],
	},
	{
		name: 'a text that is null',
		parameters: mail({ text: '={{ $json.missing }}' }),
		items: [{ missing: null }],
	},
	{
		name: 'a file from binary data',
		parameters: mail({ options: { fileAttachments: 'data' } }),
		items: [{ $binary: { data: png } }],
	},
	{
		name: 'an inline image in HTML',
		parameters: mail({
			emailFormat: 'html',
			html: '<p>Look: <img src="cid:image_1"></p>',
			options: { attachments: 'image_1' },
		}),
		items: [{ $binary: { image_1: png } }],
	},
	{
		name: 'inline files and files, text and HTML',
		parameters: mail({
			emailFormat: 'both',
			html: '<img src="cid:image_1">',
			options: { attachments: 'image_1, notes', fileAttachments: 'notes,report' },
		}),
		items: [{ $binary: { image_1: png, notes, report: unnamed } }],
	},
	{
		name: 'an attachments option and an item without binary data',
		parameters: mail({ options: { fileAttachments: 'data' } }),
		items: [{ a: 1 }],
	},
	{
		name: 'a binary field that the item does not have',
		parameters: mail({ options: { fileAttachments: 'data, other' } }),
		items: [{ $binary: { data: png } }],
	},
	{
		name: 'a binary field that the item does not have, with continue',
		parameters: mail({ options: { attachments: 'other' } }),
		items: [{ a: 1 }, { $binary: { data: png } }],
		onError: 'continueRegularOutput',
	},
	{
		name: 'two items',
		parameters: mail({ toEmail: '={{ $json.to }}', text: '=Hello {{ $json.name }}' }),
		items: [
			{ to: 'b@x.test', name: 'B' },
			{ to: 'c@x.test', name: 'C' },
		],
	},
	{
		name: 'a refused recipient among accepted ones',
		parameters: mail({ toEmail: 'b@x.test, c@x.test', options: { ccEmail: 'd@x.test' } }),
		server: { ...AUTH, refused: { 'c@x.test': '550 5.1.1 no such user' } },
	},
	{
		name: 'every recipient refused',
		parameters: mail({ toEmail: 'b@x.test, c@x.test' }),
		server: {
			...AUTH,
			refused: { 'b@x.test': '550 5.1.1 no such user', 'c@x.test': '451 4.3.0 later' },
		},
	},
	{
		name: 'every recipient refused, with continue',
		parameters: mail(),
		server: { ...AUTH, refused: { 'b@x.test': '550 5.1.1 no such user' } },
		onError: 'continueRegularOutput',
	},
	{ name: 'no recipient', parameters: mail({ toEmail: '' }) },
	{
		name: 'the login refused',
		parameters: mail(),
		server: { ...AUTH, loginReply: '535 5.7.8 Authentication credentials invalid' },
	},
	{
		name: 'the login refused, with continue',
		parameters: mail({ toEmail: '={{ $json.to }}' }),
		items: [{ to: 'b@x.test' }, { to: 'c@x.test' }],
		server: { ...AUTH, loginReply: '535 5.7.8 Authentication credentials invalid' },
		onError: 'continueRegularOutput',
	},
	{
		name: 'the login with AUTH LOGIN',
		parameters: mail(),
		server: { auth: 'LOGIN' },
	},
	{
		name: 'a server without AUTH for a credential with a login',
		parameters: mail(),
		server: {},
	},
	{ name: 'a credential without a login', parameters: mail(), credential: 'open', server: {} },
	{
		name: 'the message refused',
		parameters: mail(),
		server: { ...AUTH, messageReply: '552 5.3.4 Message too big' },
	},
	{
		name: 'a reply of the server with a code of Node.js',
		parameters: mail(),
		server: { ...AUTH, messageReply: '451 4.4.1 upstream said ETIMEDOUT' },
	},
	{
		name: 'a server without pipelining',
		parameters: mail({ toEmail: 'b@x.test, c@x.test' }),
		server: { ...AUTH, pipelining: false },
	},
	{
		name: 'STARTTLS',
		parameters: mail({ options: { allowUnauthorizedCerts: true } }),
		server: { ...AUTH, starttls: true },
	},
	{
		name: 'STARTTLS that the credential turns off',
		parameters: mail(),
		credential: 'plain',
		server: { ...AUTH, starttls: true },
	},
	{
		name: 'TLS from the first byte',
		parameters: mail({ options: { allowUnauthorizedCerts: true } }),
		credential: 'direct',
	},
	{
		name: 'STARTTLS with a certificate that is not trusted',
		parameters: mail(),
		server: { ...AUTH, starttls: true },
		host: true,
	},
	{ name: 'a port without a server', parameters: mail(), credential: 'closed' },
	{
		name: 'a port without a server, with continue',
		parameters: mail(),
		credential: 'closed',
		onError: 'continueRegularOutput',
	},
	{
		name: 'the login refused, with the error output',
		parameters: mail({ toEmail: '={{ $json.to }}' }),
		items: [{ to: 'b@x.test', n: 1 }],
		server: { ...AUTH, loginReply: '535 5.7.8 Authentication credentials invalid' },
		onError: 'continueErrorOutput',
	},
	{
		name: 'a refused recipient of the second item, with the error output',
		parameters: mail({ toEmail: '={{ $json.to }}', options: { fileAttachments: 'data' } }),
		items: [
			{ to: 'b@x.test', n: 1, $binary: { data: png } },
			{ to: 'c@x.test', n: 2, $binary: { data: png } },
			{ to: 'd@x.test', n: 3 },
		],
		server: { ...AUTH, refused: { 'c@x.test': '550 5.1.1 no such user' } },
		onError: 'continueErrorOutput',
	},
	{
		name: 'a certificate that is not trusted, with the error output',
		parameters: mail(),
		items: [{ n: 1 }],
		server: { ...AUTH, starttls: true },
		onError: 'continueErrorOutput',
		host: true,
	},
	{
		name: 'a certificate that is not trusted, with continue',
		parameters: mail(),
		server: { ...AUTH, starttls: true },
		onError: 'continueRegularOutput',
		host: true,
	},
	{
		name: 'a refused login with two tries: v1 connects two times',
		parameters: mail(),
		server: { ...AUTH, loginReply: '535 5.7.8 Authentication credentials invalid' },
		settings: { retryOnFail: true, maxTries: 2, waitBetweenTries: 100 },
	},
	{
		name: 'the second item fails with three tries: v1 sends the first message three times',
		parameters: mail({ toEmail: '={{ $json.to }}' }),
		items: [{ to: 'b@x.test' }, { to: 'c@x.test' }],
		server: { ...AUTH, refused: { 'c@x.test': '550 5.1.1 no such user' } },
		settings: { retryOnFail: true, maxTries: 3, waitBetweenTries: 100 },
	},
	{
		name: 'the first item fails with a retry and continue: v1 runs all items again',
		parameters: mail({ toEmail: '={{ $json.to }}' }),
		items: [{ to: 'c@x.test' }, { to: 'b@x.test' }],
		server: { ...AUTH, refused: { 'c@x.test': '550 5.1.1 no such user' } },
		settings: { retryOnFail: true, maxTries: 2, waitBetweenTries: 100 },
		onError: 'continueRegularOutput',
	},
	{
		name: 'the second item fails with a retry and continue: v1 does not run the node again',
		parameters: mail({ toEmail: '={{ $json.to }}' }),
		items: [{ to: 'b@x.test' }, { to: 'c@x.test' }],
		server: { ...AUTH, refused: { 'c@x.test': '550 5.1.1 no such user' } },
		settings: { retryOnFail: true, maxTries: 2, waitBetweenTries: 100 },
		onError: 'continueRegularOutput',
	},
	{
		name: 'a message that goes out with a retry setting',
		parameters: mail(),
		settings: { retryOnFail: true },
	},
	{
		name: 'an address group',
		parameters: mail({ toEmail: 'Team: b@x.test, c@x.test;' }),
		host: true,
	},
];

/** Node settings that keep the node in the fallback host. */
export const EMAIL_SEND_HOST_SETTINGS: Array<Record<string, unknown>> = [
	{ retryOnFail: true, onError: 'continueErrorOutput' },
];
