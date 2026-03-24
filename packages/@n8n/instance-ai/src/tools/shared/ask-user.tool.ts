import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

export function createAskUserTool() {
	return createTool({
		id: 'ask-user',
		description:
			'Ask the user a free-text question when you need information only they can provide (e.g., a chat ID, API key, preference, which account to use). The agent is suspended until the user responds.',
		inputSchema: z.object({
			question: z
				.string()
				.describe(
					'Clear, specific question for the user. Include context about why you need this.',
				),
		}),
		outputSchema: z.object({
			answered: z.boolean(),
			userInput: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
			inputType: z.literal('text'),
		}),
		resumeSchema: z.object({
			approved: z.boolean(),
			userInput: z.string().optional(),
		}),
		execute: async (input, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};

			// First call — always suspend to ask the user
			if (resumeData === undefined || resumeData === null) {
				await suspend?.({
					requestId: nanoid(),
					message: input.question,
					severity: 'info' as const,
					inputType: 'text' as const,
				});
				// suspend() never resolves
				return { answered: false };
			}

			// User skipped
			if (!resumeData.approved) {
				return { answered: false };
			}

			// User answered
			return { answered: true, userInput: resumeData.userInput ?? '' };
		},
	});
}
