import { int, modelId, num, oneOf } from '@n8n/node-sdk';

import { chatCompletionsModel } from '../chat-completions';
import { openAi } from '../open-ai.node';

export const openAiChatModel = openAi.subnode('chatModel', {
	action: 'OpenAI Chat Model',
	summary: 'An OpenAI chat model for an AI node, e.g. ai.prompt or ai.agent.',
	supplies: 'chatModel',
	input: {
		model: modelId('openai'),
		temperature: num().with({ minimum: 0, maximum: 2 }).optional(),
		maxTokens: int().with({ minimum: 1 }).optional().hint('Most tokens in one reply'),
		topP: num().with({ minimum: 0, maximum: 1 }).optional(),
		frequencyPenalty: num().with({ minimum: -2, maximum: 2 }).optional(),
		presencePenalty: num().with({ minimum: -2, maximum: 2 }).optional(),
		reasoningEffort: oneOf('minimal', 'low', 'medium', 'high')
			.optional()
			.hint('Reasoning models only, e.g. gpt-5 and o3'),
	},
	async supply({ input, http }) {
		return chatCompletionsModel(http, input);
	},
});
