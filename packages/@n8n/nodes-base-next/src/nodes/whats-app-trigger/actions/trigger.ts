import { arr, num, obj, oneOf, str } from '@n8n/node-sdk';

import { whatsAppTrigger } from '../whats-app-trigger.node';

const fields = oneOf(
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

const media = obj({
	id: str().hint('Media ID; download it with the WhatsApp media API'),
	mime_type: str(),
	sha256: str().optional(),
	caption: str().optional(),
	filename: str().optional().hint('For a document'),
});
const reply = obj({ id: str(), title: str(), description: str().optional() });

const message = obj({
	from: str().hint('Sender phone number, digits only'),
	id: str(),
	timestamp: str().hint('Unix seconds'),
	type: oneOf(
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
	text: obj({ body: str() }).optional().hint('For type text'),
	image: media.optional(),
	audio: media.optional(),
	video: media.optional(),
	document: media.optional(),
	sticker: media.optional(),
	location: obj({
		latitude: num(),
		longitude: num(),
		name: str().optional(),
		address: str().optional(),
	}).optional(),
	interactive: obj({
		type: oneOf('button_reply', 'list_reply'),
		button_reply: reply.optional(),
		list_reply: reply.optional(),
	}).optional(),
	button: obj({ payload: str(), text: str() }).optional().hint('A quick-reply button'),
	reaction: obj({ message_id: str(), emoji: str() }).optional(),
	context: obj({ from: str(), id: str() }).optional().hint('The message this one answers'),
});

/** The WhatsApp Trigger node, version 1. One item per change of each delivery. */
export const whatsAppEvent = whatsAppTrigger.trigger('trigger', {
	trigger: 'On WhatsApp event',
	summary: 'Starts on each WhatsApp Business event of the app, e.g. a received message.',
	input: {
		updates: arr(fields)
			.with({ minItems: 1 })
			.hint('messages: received messages and their statuses'),
		options: obj({
			messageStatusUpdates: arr(oneOf('all', 'deleted', 'delivered', 'failed', 'read', 'sent'))
				.optional()
				.hint('Status updates that start the workflow; [] for none'),
		}).optional(),
	},
	output: obj({
		field: fields,
		messaging_product: str(),
		metadata: obj({ display_phone_number: str(), phone_number_id: str() }),
		contacts: arr(obj({ profile: obj({ name: str() }), wa_id: str() }))
			.optional()
			.hint('For field messages: the senders'),
		messages: arr(message).optional().hint('For a received message; absent on a status update'),
		statuses: arr(
			obj({
				id: str(),
				status: oneOf('sent', 'delivered', 'read', 'failed', 'deleted'),
				timestamp: str(),
				recipient_id: str(),
			}),
		)
			.optional()
			.hint('For a status update; absent on a received message'),
	}),
	native: { type: 'n8n-nodes-base.whatsAppTrigger', version: 1, on: 'webhook' },
});
