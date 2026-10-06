import { t } from '@n8n/node-sdk';

import { chatCompletionsModel } from '../chat-completions';
import { openAi } from '../open-ai.node';

export const openAiChatModel = openAi.provider('chatModel', {
	action: 'OpenAI Chat Model',
	summary: 'An OpenAI chat model for an AI node, e.g. ai.prompt or ai.agent.',
	provides: 'chatModel',
	input: {
		model: t.modelId('openai').title('Model'),
		temperature: t.num().with({ minimum: 0, maximum: 2 }).optional().title('Sampling Temperature'),
		maxTokens: t
			.int()
			.with({ minimum: 1 })
			.optional()
			.hint('Most tokens in one reply')
			.title('Maximum Number of Tokens'),
		topP: t.num().with({ minimum: 0, maximum: 1 }).optional().title('Top P'),
		frequencyPenalty: t
			.num()
			.with({ minimum: -2, maximum: 2 })
			.optional()
			.title('Frequency Penalty'),
		presencePenalty: t.num().with({ minimum: -2, maximum: 2 }).optional().title('Presence Penalty'),
		reasoningEffort: t
			.oneOf('minimal', 'low', 'medium', 'high')
			.optional()
			.title('Reasoning Effort')
			.hint('Reasoning models only, e.g. gpt-5 and o3'),
	},
	async provide({ input, http }) {
		return chatCompletionsModel(http, input);
	},
});
