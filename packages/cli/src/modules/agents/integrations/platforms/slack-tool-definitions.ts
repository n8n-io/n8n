import { z } from 'zod';

import type { IntegrationActionDefinition } from '../integration-tool-types';

const addReactionActionInputSchema = z.object({
	action: z.literal('add_reaction'),
	input: z
		.object({
			emoji: z
				.string()
				.min(1)
				.describe('Emoji name or shortcode to add, for example eyes or :white_check_mark:.'),
			threadId: z
				.string()
				.min(1)
				.optional()
				.describe('Optional Slack thread ID. Defaults to the latest message context.'),
			messageId: z
				.string()
				.min(1)
				.optional()
				.describe('Optional Slack message timestamp. Defaults to the latest message context.'),
		})
		.strict(),
});

const doNotRespondActionInputSchema = z.object({
	action: z.literal('do_not_respond'),
	input: z.object({}).strict(),
});

export const SLACK_ACTION_TOOL_DEFINITIONS = [
	{
		name: 'add_reaction',
		inputSchema: addReactionActionInputSchema,
		description:
			'add_reaction: input.emoji is required. For Slack, optional input.threadId and input.messageId target a specific message; otherwise the latest message context is used.',
	},
	{
		name: 'do_not_respond',
		inputSchema: doNotRespondActionInputSchema,
		description:
			'do_not_respond: no input. Ends the turn without sending any message. Use only for messages in subscribed group channels or threads that need no reaction from you, or when the user explicitly asked you not to reply. Never use it for direct messages or direct mentions. After calling it, stop immediately — do not write any text and never post a message saying you are staying silent.',
	},
] satisfies IntegrationActionDefinition[];
