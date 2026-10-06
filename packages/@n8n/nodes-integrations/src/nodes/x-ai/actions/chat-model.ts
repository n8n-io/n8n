import { t } from '@n8n/node-sdk';

import { chatCompletionsModel } from '../../open-ai/chat-completions';
import { xAi } from '../x-ai.node';

export const xAiChatModel = xAi.provider('chatModel', {
	action: 'xAI Grok Chat Model',
	summary: 'An xAI Grok chat model for an AI node, e.g. ai.prompt or ai.agent.',
	provides: 'chatModel',
	input: {
		model: t
			.modelId('xai')
			.hint('A model ID from the catalog, e.g. grok-4; never invent one')
			.title('Model'),
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
		return chatCompletionsModel(http, input, { maxTokensField: 'max_tokens' });
	},
});
