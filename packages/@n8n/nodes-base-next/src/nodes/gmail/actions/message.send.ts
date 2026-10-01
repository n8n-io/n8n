import { arr, bool, isRecord, matches, obj, str, variant, type Http } from '@n8n/node-sdk';

import { message } from '../gmail.node';
import { addressList, displayName, encodeWords, oneLine } from '../mime';

const ATTRIBUTION = 'This email was sent automatically with ';
const LINK =
	'https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.gmail';

const addresses = str().hint('Comma-separated addresses');

const sent = obj({ id: str(), threadId: str(), labelIds: arr(str()).optional() }).with({
	additionalProperties: true,
});

async function senderAddress(http: Http) {
	const profile = await http.request({ path: '/profile' });
	if (!isRecord(profile) || typeof profile.emailAddress !== 'string') {
		throw new Error('Gmail returned no profile address');
	}
	return profile.emailAddress;
}

export const sendGmailMessage = message.action('send', {
	patch: 3,
	action: 'Send a message',
	summary: 'Send an email.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
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
	async run({ input, http }) {
		const html = input.body.format === 'html';
		const text = (input.body.format === 'html' ? input.body.html : input.body.text).trim();
		const footer = html
			? `<br><br>---<br><em>${ATTRIBUTION}<a href="${LINK}" target="_blank">n8n</a></em>`
			: `\n\n---\n${ATTRIBUTION}n8n\nhttps://n8n.io`;
		const content = input.appendAttribution ? `${text}${footer}` : text;
		const from = input.senderName
			? `${displayName(input.senderName)} <${await senderAddress(http)}>`
			: undefined;
		const headers: Array<[string, string | undefined]> = [
			['From', from],
			['To', addressList(input.to, 'To')],
			['Cc', input.cc && addressList(input.cc, 'CC')],
			['Bcc', input.bcc && addressList(input.bcc, 'BCC')],
			['Reply-To', input.replyTo && addressList(input.replyTo, 'ReplyTo')],
			['Subject', encodeWords(oneLine(input.subject))],
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
		return response;
	},
});
