import { t } from '@n8n/node-sdk';

import { facebookTrigger } from '../facebook-trigger.node';

/** The value of a page `feed` change, e.g. a new comment, as the Graph API documents it. */
const change = t.obj({
	field: t.str().hint('The subscribed field, e.g. feed'),
	value: t
		.obj({
			item: t.str().optional().hint('For feed: comment, post, reaction, status, photo, …'),
			verb: t
				.oneOf(
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
				)
				.optional(),
			from: t
				.obj({ id: t.str(), name: t.str().optional() })
				.optional()
				.hint('For feed: who wrote it'),
			message: t.str().optional().hint('For feed: the text of the post or comment'),
			post_id: t.str().optional(),
			comment_id: t.str().optional(),
			parent_id: t.str().optional(),
			reaction_type: t.str().optional().hint('For item reaction, e.g. like or love'),
			link: t.str().optional(),
			photo: t.str().optional(),
			published: t.int().optional(),
			created_time: t.int().optional().hint('Unix seconds'),
		})
		.hint('The feed shape; other fields send other values'),
});

/** The Facebook Trigger node, version 1. One item per entry of each delivery. */
export const facebookEvent = facebookTrigger.trigger('trigger', {
	trigger: 'On Facebook event',
	summary:
		'Starts on each change of the subscribed fields of a Meta app object, e.g. page comments.',
	input: {
		authType: t
			.oneOf('accessToken', 'oAuth2')
			.default('accessToken')
			.hint('accessToken: facebookGraphAppApi; oAuth2: facebookGraphAppOAuth2Api'),
		appId: t.str().with({ minLength: 1 }).hint('The Meta app ID'),
		object: t
			.oneOf(
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
		fields: t
			.arr(t.str())
			.with({ minItems: 1 })
			.hint('Fields of the object to subscribe to, e.g. feed for page posts and comments'),
		options: t.obj({ includeValues: t.bool().optional() }).optional(),
	},
	output: t.obj({
		id: t.str().hint('The ID of the changed object, e.g. the page'),
		time: t.int().hint('Unix seconds'),
		changes: t.arr(change).optional().hint('For subscribed fields'),
		messaging: t
			.arr(
				t.obj({
					sender: t.obj({ id: t.str() }),
					recipient: t.obj({ id: t.str() }),
					timestamp: t.int(),
					message: t.obj({ mid: t.str(), text: t.str().optional() }).optional(),
				}),
			)
			.optional()
			.hint('Messenger events of a page'),
	}),
	native: { type: 'n8n-nodes-base.facebookTrigger', version: 1, on: 'webhook' },
});
