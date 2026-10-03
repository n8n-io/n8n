import { isRecord, matches, path, t, type Http } from '@n8n/node-sdk';

import { message } from '../gmail.node';
import {
	addressList,
	base64Of,
	displayName,
	encodeWords,
	mixedMessage,
	oneLine,
	utf8,
} from '../mime';

const ATTRIBUTION = 'This email was sent automatically with ';
const LINK =
	'https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.gmail';

/** The media upload takes the MIME message as the body, so an attachment never goes into JSON. */
const UPLOAD_URL = 'https://www.googleapis.com/upload/gmail/v1/users/me/messages/send';

const addresses = t.str().hint('Comma-separated addresses');

const sent = t.obj({ id: t.str(), threadId: t.str(), labelIds: t.arr(t.str()).optional() }).with({
	additionalProperties: true,
});

async function senderAddress(http: Http) {
	const profile = await http.request({ path: path`/profile` });
	if (!isRecord(profile) || typeof profile.emailAddress !== 'string') {
		throw new Error('Gmail returned no profile address');
	}
	return profile.emailAddress;
}

export const sendGmailMessage = message.action('send', {
	minor: 1,
	patch: 1,
	action: 'Send a message',
	summary: 'Send an email.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	input: {
		to: addresses,
		subject: t.str(),
		body: t.variant('format', { text: { text: t.str() }, html: { html: t.str() } }),
		cc: addresses.optional(),
		bcc: addresses.optional(),
		senderName: t.str().hint('Display name; the address is the account address').optional(),
		replyTo: addresses.optional(),
		appendAttribution: t.bool().default(true).hint('Adds a "sent with n8n" footer'),
		attachments: t
			.arr(t.binary())
			.hint('Files to attach, e.g. [(item) => item.binary.data]')
			.optional(),
	},
	output: sent,
	async run({ input, http, binary: binaries }) {
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
		];
		const textType = `text/${html ? 'html' : 'plain'}; charset=utf-8`;
		if (input.attachments?.length) {
			const mixed = mixedMessage(headers, { type: textType, content }, input.attachments);
			const raw = await binaries.create({ mimeType: 'message/rfc822' }, mixed);
			const uploaded = await http.request({
				method: 'POST',
				url: UPLOAD_URL,
				query: { uploadType: 'media' },
				body: raw,
			});
			if (!matches(sent, uploaded)) throw new Error('Gmail returned no message ID');
			return uploaded;
		}
		const mime = [
			...[...headers, ['Content-Type', textType], ['Content-Transfer-Encoding', 'base64']].flatMap(
				([name, value]) => (value ? [`${name}: ${value}`] : []),
			),
			'',
			base64Of(utf8(content)).replace(/.{76}/g, '$&\r\n'),
		].join('\r\n');
		const response = await http.request({
			method: 'POST',
			path: path`/messages/send`,
			// base64url without padding, as Gmail reads `raw`.
			body: {
				raw: base64Of(utf8(mime)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
			},
		});
		if (!matches(sent, response)) throw new Error('Gmail returned no message ID');
		return response;
	},
});
