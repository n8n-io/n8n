import { bool, str, variant } from '@n8n/node-sdk';

import { message, sendMessage, sent } from '../whats-app.node';

const media = variant('source', {
	link: { link: str().with({ format: 'uri' }).hint('Public HTTPS URL that WhatsApp downloads') },
	id: { id: str().hint('Media ID from an earlier upload to WhatsApp') },
});

const caption = str().optional();

export const sendWhatsAppMessage = message.action('send', {
	action: 'Send a message',
	summary: 'Send a text or media message to a WhatsApp number from a business phone number.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	scopes: ['whatsapp_business_messaging'],
	input: {
		message: variant('type', {
			text: {
				body: str().with({ minLength: 1 }).hint('At most 4096 characters'),
				previewUrl: bool().default(false).hint('Show a preview of the first URL'),
			},
			image: { media, caption },
			video: { media, caption },
			audio: { media },
			document: { media, caption, filename: str().optional() },
			sticker: { media },
		}).hint('Outside the 24-hour reply window, use message.sendTemplate'),
	},
	output: sent,
	async run({ input, http }) {
		const content = input.message;
		const payload =
			content.type === 'text'
				? { body: content.body, ...(content.previewUrl ? { preview_url: true } : {}) }
				: {
						...(content.media.source === 'link'
							? { link: content.media.link }
							: { id: content.media.id }),
						...('caption' in content && content.caption ? { caption: content.caption } : {}),
						...('filename' in content && content.filename ? { filename: content.filename } : {}),
					};
		return await sendMessage(http, input, content.type, payload);
	},
});
