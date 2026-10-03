import { promptReply, replyOutput, replyOutputOf, replySchema, t } from '@n8n/node-sdk';

import { chatCompletionsModel } from '../chat-completions';
import { text } from '../open-ai.node';

export const messageOpenAi = text.action('message', {
	action: 'Message a model',
	summary:
		'Send one prompt to an OpenAI model and get its reply: text, or an object typed by schema.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: {
		model: t.modelId('openai'),
		prompt: t.str().with({ minLength: 1 }),
		system: t.str().optional().hint('Instructions for the model'),
		schema: replySchema,
		temperature: t.num().with({ minimum: 0, maximum: 2 }).optional(),
		maxTokens: t.int().with({ minimum: 1 }).optional().hint('Most tokens in one reply'),
		reasoningEffort: t
			.oneOf('minimal', 'low', 'medium', 'high')
			.optional()
			.hint('Reasoning models only, e.g. gpt-5 and o3'),
	},
	output: replyOutput,
	deriveOutput: ({ schema }) => replyOutputOf(schema),
	async run({ input, http }) {
		return await promptReply(chatCompletionsModel(http, input), input);
	},
});
