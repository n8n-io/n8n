import { int, modelId, num, oneOf, str } from '@n8n/node-sdk';

import { promptReply, replyOutput, replyOutputOf, replySchema } from '../../ai/reply';
import { chatCompletionsModel } from '../chat-completions';
import { text } from '../open-ai.node';

export const messageOpenAi = text.action('message', {
	action: 'Message a model',
	summary:
		'Send one prompt to an OpenAI model and get its reply: text, or an object typed by schema.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: {
		model: modelId('openai'),
		prompt: str().with({ minLength: 1 }),
		system: str().optional().hint('Instructions for the model'),
		schema: replySchema,
		temperature: num().with({ minimum: 0, maximum: 2 }).optional(),
		maxTokens: int().with({ minimum: 1 }).optional().hint('Most tokens in one reply'),
		reasoningEffort: oneOf('minimal', 'low', 'medium', 'high')
			.optional()
			.hint('Reasoning models only, e.g. gpt-5 and o3'),
	},
	output: replyOutput,
	deriveOutput: ({ schema }) => replyOutputOf(schema),
	async run({ input, http }) {
		return await promptReply(chatCompletionsModel(http, input), input);
	},
});
