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

export const SLACK_ACTION_TOOL_DEFINITIONS = [
	{
		name: 'add_reaction',
		inputSchema: addReactionActionInputSchema,
		description:
			'add_reaction: input.emoji is required. For Slack, optional input.threadId and input.messageId target a specific message; otherwise the latest message context is used.',
	},
] satisfies IntegrationActionDefinition[];
