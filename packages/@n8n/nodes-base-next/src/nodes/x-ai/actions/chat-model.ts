import { int, modelId, num } from '@n8n/node-sdk';

import { chatCompletionsModel } from '../../open-ai/chat-completions';
import { xAi } from '../x-ai.node';

export const xAiChatModel = xAi.subnode('chatModel', {
	action: 'xAI Grok Chat Model',
	summary: 'An xAI Grok chat model for an AI node, e.g. ai.prompt or ai.agent.',
	supplies: 'chatModel',
	input: {
		model: modelId('xai').hint('A model ID from the catalog, e.g. grok-4; never invent one'),
		temperature: num().with({ minimum: 0, maximum: 2 }).optional(),
		maxTokens: int().with({ minimum: 1 }).optional().hint('Most tokens in one reply'),
		topP: num().with({ minimum: 0, maximum: 1 }).optional(),
	},
	async supply({ input, http }) {
		return chatCompletionsModel(http, input, { maxTokensField: 'max_tokens' });
	},
});
