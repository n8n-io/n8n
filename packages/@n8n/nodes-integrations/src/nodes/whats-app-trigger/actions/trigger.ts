import { t } from '@n8n/node-sdk';

import { whatsAppTrigger } from '../whats-app-trigger.node';

const fields = t.oneOf(
	'account_review_update',
	'account_update',
	'business_capability_update',
	'message_template_quality_update',
	'message_template_status_update',
	'messages',
	'phone_number_name_update',
	'phone_number_quality_update',
	'security',
	'template_category_update',
);

const media = t.obj({
	id: t.str().hint('Media ID; download it with the WhatsApp media API'),
	mime_type: t.str(),
	sha256: t.str().optional(),
	caption: t.str().optional(),
	filename: t.str().optional().hint('For a document'),
});
const reply = t.obj({ id: t.str(), title: t.str(), description: t.str().optional() });

const message = t.obj({
	from: t.str().hint('Sender phone number, digits only'),
	id: t.str(),
	timestamp: t.str().hint('Unix seconds'),
	type: t.oneOf(
		'text',
		'image',
		'audio',
		'video',
		'document',
		'sticker',
		'location',
		'contacts',
		'interactive',
		'button',
		'reaction',
		'order',
		'system',
		'unknown',
	),
	text: t.obj({ body: t.str() }).optional().hint('For type text'),
	image: media.optional(),
	audio: media.optional(),
	video: media.optional(),
	document: media.optional(),
	sticker: media.optional(),
	location: t
		.obj({
			latitude: t.num(),
			longitude: t.num(),
			name: t.str().optional(),
			address: t.str().optional(),
		})
		.optional(),
	interactive: t
		.obj({
			type: t.oneOf('button_reply', 'list_reply'),
			button_reply: reply.optional(),
			list_reply: reply.optional(),
		})
		.optional(),
	button: t.obj({ payload: t.str(), text: t.str() }).optional().hint('A quick-reply button'),
	reaction: t.obj({ message_id: t.str(), emoji: t.str() }).optional(),
	context: t.obj({ from: t.str(), id: t.str() }).optional().hint('The message this one answers'),
});

/** The WhatsApp Trigger node, version 1. One item per change of each delivery. */
export const whatsAppEvent = whatsAppTrigger.trigger('trigger', {
	trigger: 'On WhatsApp event',
	summary: 'Starts on each WhatsApp Business event of the app, e.g. a received message.',
	input: {
		updates: t
			.arr(fields)
			.with({ minItems: 1 })
			.hint('messages: received messages and their statuses'),
		options: t
			.obj({
				messageStatusUpdates: t
					.arr(t.oneOf('all', 'deleted', 'delivered', 'failed', 'read', 'sent'))
					.optional()
					.hint('Status updates that start the workflow; [] for none'),
			})
			.optional(),
	},
	output: t.obj({
		field: fields,
		messaging_product: t.str(),
		metadata: t.obj({ display_phone_number: t.str(), phone_number_id: t.str() }),
		contacts: t
			.arr(t.obj({ profile: t.obj({ name: t.str() }), wa_id: t.str() }))
			.optional()
			.hint('For field messages: the senders'),
		messages: t.arr(message).optional().hint('For a received message; absent on a status update'),
		statuses: t
			.arr(
				t.obj({
					id: t.str(),
					status: t.oneOf('sent', 'delivered', 'read', 'failed', 'deleted'),
					timestamp: t.str(),
					recipient_id: t.str(),
				}),
			)
			.optional()
			.hint('For a status update; absent on a received message'),
	}),
	native: { type: 'n8n-nodes-base.whatsAppTrigger', version: 1, on: 'webhook' },
});
