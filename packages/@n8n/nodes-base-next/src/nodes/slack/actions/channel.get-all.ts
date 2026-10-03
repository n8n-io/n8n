import { paging, path, t } from '@n8n/node-sdk';

import { channel, slackChannel, slackList, slackResponse } from '../slack.node';

const page = slackResponse({ channels: t.arr(slackChannel) });

export const getManySlackChannels = channel.action('getAll', {
	patch: 1,
	action: 'Get many channels',
	summary: 'List Slack channels with their IDs, e.g. to find the ID of a #name.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	scopes: ['channels:read', 'groups:read', 'im:read', 'mpim:read'],
	input: {
		types: t
			.arr(t.oneOf('public_channel', 'private_channel', 'mpim', 'im'))
			.with({ minItems: 1 })
			.default(['public_channel']),
		excludeArchived: t.bool().default(false),
		paging,
	},
	output: slackChannel,
	async *run({ input, http }) {
		yield* slackList(http, {
			path: path`/conversations.list`,
			query: {
				types: input.types.join(','),
				exclude_archived: input.excludeArchived ? true : undefined,
			},
			page,
			items: ({ channels }) => channels ?? [],
			paging: input.paging,
		});
	},
});
