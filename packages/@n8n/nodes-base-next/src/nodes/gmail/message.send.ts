import { arr, bool, defineAction, matches, obj, str, variant, type Http } from '@n8n/node-sdk';

import { gmail } from './node';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const ATTRIBUTION = 'This email was sent automatically with ';
const LINK =
	'https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.gmail';

const addresses = str().hint('Comma-separated addresses');

const sent = obj({ id: str(), threadId: str(), labelIds: arr(str()).optional() }).with({
	additionalProperties: true,
});

/** Header values stay on one line. */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ');

/** RFC 2047 encoded word for text outside printable ASCII. */
const encodeWord = (value: string) =>
	/^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value).toString('base64')}?=`;

/** Mirrors `prepareEmailsInput` in nodes-base Gmail/GenericFunctions.ts. */
function addressList(value: string, field: string) {
	const entries = value.split(',').map((entry) => oneLine(entry.trim()));
	const invalid = entries.find((entry) => !entry.includes('@'));
	if (invalid !== undefined) {
		throw new Error(`Invalid email address: '${invalid}' in the '${field}' field isn't valid`);
	}
	return entries.join(', ');
}

async function senderAddress(http: Http) {
	const profile = await http.request({ path: '/profile' });
	if (!isRecord(profile) || typeof profile.emailAddress !== 'string') {
		throw new Error('Gmail returned no profile address');
	}
	return profile.emailAddress;
}

export const sendGmailMessage = defineAction({
	node: gmail,
	id: 'gmail.message.send',
	action: 'Send a message',
	summary: 'Send an email.',
	flow: { effect: 'write', cardinality: 'per-item', passthrough: 'replace', idempotent: false },
	input: {
		to: addresses,
		subject: str(),
		body: variant('format', { text: { text: str() }, html: { html: str() } }),
		cc: addresses.optional(),
		bcc: addresses.optional(),
		senderName: str().hint('Display name; the address is the account address').optional(),
		replyTo: addresses.optional(),
		appendAttribution: bool().default(true).hint('Adds a "sent with n8n" footer'),
	},
	output: sent,
	async run({ input, http, emit }) {
		const html = input.body.format === 'html';
		const message = (input.body.format === 'html' ? input.body.html : input.body.text).trim();
		const content =
			input.appendAttribution === false
				? message
				: html
					? `${message}<br><br>---<br><em>${ATTRIBUTION}<a href="${LINK}" target="_blank">n8n</a></em>`
					: `${message}\n\n---\n${ATTRIBUTION}n8n\nhttps://n8n.io`;
		const from = input.senderName
			? `${encodeWord(oneLine(input.senderName))} <${await senderAddress(http)}>`
			: undefined;
		const headers: Array<[string, string | undefined]> = [
			['From', from],
			['To', addressList(input.to, 'To')],
			['Cc', input.cc && addressList(input.cc, 'CC')],
			['Bcc', input.bcc && addressList(input.bcc, 'BCC')],
			['Reply-To', input.replyTo && addressList(input.replyTo, 'ReplyTo')],
			['Subject', encodeWord(oneLine(input.subject))],
			['MIME-Version', '1.0'],
			['Content-Type', `text/${html ? 'html' : 'plain'}; charset=utf-8`],
			['Content-Transfer-Encoding', 'base64'],
		];
		const mime = [
			...headers.flatMap(([name, value]) => (value ? [`${name}: ${value}`] : [])),
			'',
			Buffer.from(content).toString('base64').replace(/.{76}/g, '$&\r\n'),
		].join('\r\n');
		const response = await http.request({
			method: 'POST',
			path: '/messages/send',
			body: { raw: Buffer.from(mime).toString('base64url') },
		});
		if (!matches(sent, response)) throw new Error('Gmail returned no message ID');
		emit(response);
	},
});
