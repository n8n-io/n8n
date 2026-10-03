import { path, ref } from '@n8n/node-sdk';

import { channel, slackChannel, slackChannelId, slackGet, slackResponse } from '../slack.node';

const info = slackResponse({ channel: slackChannel });

export const getSlackChannel = channel.action('get', {
	action: 'Get a channel',
	summary: 'Get the details of a Slack channel by ID.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	scopes: ['channels:read', 'groups:read', 'im:read', 'mpim:read'],
	input: { channel: ref(slackChannelId) },
	output: slackChannel,
	async run({ input, http }) {
		return (
			(await slackGet(http, path`/conversations.info`, { channel: input.channel }, info)).channel ??
			{}
		);
	},
});
