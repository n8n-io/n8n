import { t } from '@n8n/node-sdk';

import { chatCompletionsModel } from '../chat-completions';
import { openAi } from '../open-ai.node';

export const openAiChatModel = openAi.provider('chatModel', {
	action: 'OpenAI Chat Model',
	summary: 'An OpenAI chat model for an AI node, e.g. ai.prompt or ai.agent.',
	provides: 'chatModel',
	input: {
		model: t.modelId('openai'),
		temperature: t.num().with({ minimum: 0, maximum: 2 }).optional(),
		maxTokens: t.int().with({ minimum: 1 }).optional().hint('Most tokens in one reply'),
		topP: t.num().with({ minimum: 0, maximum: 1 }).optional(),
		frequencyPenalty: t.num().with({ minimum: -2, maximum: 2 }).optional(),
		presencePenalty: t.num().with({ minimum: -2, maximum: 2 }).optional(),
		reasoningEffort: t
			.oneOf('minimal', 'low', 'medium', 'high')
			.optional()
			.hint('Reasoning models only, e.g. gpt-5 and o3'),
	},
	async provide({ input, http }) {
		return chatCompletionsModel(http, input);
	},
});
