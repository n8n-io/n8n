import { t } from '@n8n/node-sdk';

import { message, sendMessage, sent } from '../whats-app.node';

const media = t
	.variant('source', {
		link: {
			link: t
				.str()
				.with({ format: 'uri' })
				.title('Link')
				.hint('Public HTTPS URL that WhatsApp downloads'),
		},
		id: { id: t.str().title('ID').hint('Media ID from an earlier upload to WhatsApp') },
	})
	.title('Media');

const caption = t.str().optional().title('Caption');

export const sendWhatsAppMessage = message.action('send', {
	action: 'Send a message',
	summary: 'Send a text or media message to a WhatsApp number from a business phone number.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	scopes: ['whatsapp_business_messaging'],
	input: {
		message: t
			.variant('type', {
				text: {
					body: t.str().with({ minLength: 1 }).title('Text Body').hint('At most 4096 characters'),
					previewUrl: t
						.bool()
						.default(false)
						.title('Show URL Previews')
						.hint('Show a preview of the first URL'),
				},
				image: { media, caption },
				video: { media, caption },
				audio: { media },
				document: { media, caption, filename: t.str().optional().title('Filename') },
				sticker: { media },
			})
			.title('Message')
			.hint('Outside the 24-hour reply window, use message.sendTemplate'),
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
