import { path } from '@n8n/node-sdk';

import {
	chatMessage,
	content,
	messageBodyOf,
	postMessage,
	teamsMessage,
} from '../microsoft-teams.node';

export const createTeamsChatMessage = chatMessage.action('create', {
	action: 'Send a chat message',
	summary: 'Post a message to a Microsoft Teams chat: a 1:1, group or meeting chat.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	scopes: ['Chat.ReadWrite'],
	input: content,
	output: teamsMessage,
	async run({ input, http }) {
		return await postMessage(
			http,
			path`/v1.0/chats/${input.chatId}/messages`,
			messageBodyOf(input),
		);
	},
});
