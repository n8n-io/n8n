import { str, supplied } from '@n8n/node-sdk';

import { ai } from '../ai.node';
import { promptReply, replyOutput, replyOutputOf, replySchema } from '../reply';

export const promptModel = ai.action('prompt', {
	action: 'Prompt a model',
	summary:
		'Prompt a chat model and get its reply as text, or as an object typed by schema, e.g. to extract fields.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: {
		model: supplied('chatModel'),
		prompt: str().with({ minLength: 1 }),
		system: str().optional().hint('Instructions for the model'),
		schema: replySchema,
	},
	output: replyOutput,
	deriveOutput: ({ schema }) => replyOutputOf(schema),
	async run({ input }) {
		return await promptReply(input.model, input);
	},
});
