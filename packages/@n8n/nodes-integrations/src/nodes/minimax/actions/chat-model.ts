import { t } from '@n8n/node-sdk';

import { chatCompletionsModel } from '../../open-ai/chat-completions';
import { minimax } from '../minimax.node';

export const minimaxChatModel = minimax.provider('chatModel', {
	action: 'MiniMax Chat Model',
	summary: 'A MiniMax chat model for an AI node, e.g. ai.prompt or ai.agent.',
	provides: 'chatModel',
	input: {
		model: t
			.modelId('minimax')
			.title('Model')
			.hint('A model ID from the catalog, e.g. MiniMax-M2; never invent one'),
		temperature: t.num().with({ minimum: 0, maximum: 2 }).optional().title('Sampling Temperature'),
		maxTokens: t
			.int()
			.with({ minimum: 1 })
			.optional()
			.hint('Most tokens in one reply')
			.title('Maximum Number of Tokens'),
		topP: t.num().with({ minimum: 0, maximum: 1 }).optional().title('Top P'),
	},
	async provide({ input, http }) {
		// MiniMax puts its reasoning in the reply text unless the request splits it out.
		return chatCompletionsModel(http, input, {
			maxTokensField: 'max_tokens',
			extraBody: { reasoning_split: true },
		});
	},
});
