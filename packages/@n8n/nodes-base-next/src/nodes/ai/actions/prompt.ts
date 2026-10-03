import { promptReply, provider, replyOutput, replyOutputOf, replySchema, t } from '@n8n/node-sdk';

import { ai } from '../ai.node';

export const promptModel = ai.action('prompt', {
	action: 'Prompt a model',
	summary:
		'Prompt a chat model and get its reply as text, or as an object typed by schema, e.g. to extract fields.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: {
		model: provider.input('chatModel'),
		prompt: t.str().with({ minLength: 1 }),
		system: t.str().optional().hint('Instructions for the model'),
		schema: replySchema,
	},
	output: replyOutput,
	deriveOutput: ({ schema }) => replyOutputOf(schema),
	async run({ input }) {
		return await promptReply(input.model, input);
	},
});
