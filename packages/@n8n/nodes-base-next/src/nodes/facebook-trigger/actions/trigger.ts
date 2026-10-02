import { arr, bool, int, obj, oneOf, str } from '@n8n/node-sdk';

import { facebookTrigger } from '../facebook-trigger.node';

/** The value of a page `feed` change, e.g. a new comment, as the Graph API documents it. */
const change = obj({
	field: str().hint('The subscribed field, e.g. feed'),
	value: obj({
		item: str().optional().hint('For feed: comment, post, reaction, status, photo, …'),
		verb: oneOf(
			'add',
			'block',
			'edit',
			'edited',
			'hide',
			'mute',
			'remove',
			'unblock',
			'unhide',
			'update',
		).optional(),
		from: obj({ id: str(), name: str().optional() }).optional().hint('For feed: who wrote it'),
		message: str().optional().hint('For feed: the text of the post or comment'),
		post_id: str().optional(),
		comment_id: str().optional(),
		parent_id: str().optional(),
		reaction_type: str().optional().hint('For item reaction, e.g. like or love'),
		link: str().optional(),
		photo: str().optional(),
		published: int().optional(),
		created_time: int().optional().hint('Unix seconds'),
	}).hint('The feed shape; other fields send other values'),
});

/** The Facebook Trigger node, version 1. One item per entry of each delivery. */
export const facebookEvent = facebookTrigger.trigger('trigger', {
	trigger: 'On Facebook event',
	summary:
		'Starts on each change of the subscribed fields of a Meta app object, e.g. page comments.',
	input: {
		authType: oneOf('accessToken', 'oAuth2')
			.default('accessToken')
			.hint('accessToken: facebookGraphAppApi; oAuth2: facebookGraphAppOAuth2Api'),
		appId: str().with({ minLength: 1 }).hint('The Meta app ID'),
		object: oneOf(
			'adAccount',
			'application',
			'certificateTransparency',
			'group',
			'instagram',
			'link',
			'page',
			'permissions',
			'user',
			'whatsappBusinessAccount',
			'workplaceSecurity',
		)
			.default('user')
			.hint('page for page posts and comments; WhatsApp has its own trigger'),
		fields: arr(str())
			.with({ minItems: 1 })
			.hint('Fields of the object to subscribe to, e.g. feed for page posts and comments'),
		options: obj({ includeValues: bool().optional() }).optional(),
	},
	output: obj({
		id: str().hint('The ID of the changed object, e.g. the page'),
		time: int().hint('Unix seconds'),
		changes: arr(change).optional().hint('For subscribed fields'),
		messaging: arr(
			obj({
				sender: obj({ id: str() }),
				recipient: obj({ id: str() }),
				timestamp: int(),
				message: obj({ mid: str(), text: str().optional() }).optional(),
			}),
		)
			.optional()
			.hint('Messenger events of a page'),
	}),
	native: { type: 'n8n-nodes-base.facebookTrigger', version: 1, on: 'webhook' },
});
