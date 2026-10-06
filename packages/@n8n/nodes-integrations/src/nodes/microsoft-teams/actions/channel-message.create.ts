import { path, t } from '@n8n/node-sdk';

import {
	channelMessage,
	content,
	messageBodyOf,
	postMessage,
	teamsMessage,
} from '../microsoft-teams.node';

export const createTeamsChannelMessage = channelMessage.action('create', {
	action: 'Send a channel message',
	summary: 'Post a message to a Microsoft Teams channel, or reply in a thread of the channel.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	scopes: ['Group.ReadWrite.All'],
	input: {
		...content,
		replyToId: t
			.str()
			.with({ pattern: '^[0-9]+$' })
			.title('Reply to ID')
			.hint('ID of the parent message, to reply in its thread')
			.optional(),
	},
	output: teamsMessage,
	async run({ input, http }) {
		const target = input.replyToId
			? path`/v1.0/teams/${input.teamId}/channels/${input.channelId}/messages/${input.replyToId}/replies`
			: path`/v1.0/teams/${input.teamId}/channels/${input.channelId}/messages`;
		return await postMessage(http, target, messageBodyOf(input));
	},
});
