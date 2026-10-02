import { arr, bool, obj, parse, passedItem, str, supplied, type JsonSchema } from '@n8n/node-sdk';

import { ai } from '../ai.node';
import { assertFinished, parseReply, promptMessages } from '../reply';

/** The output for an item that fits no category. Error items also go to the last output. */
const OTHER = 'other';

const picked = obj({ categories: arr(str()) });

const categorySchema = (names: readonly string[]): JsonSchema => ({
	type: 'object',
	properties: { categories: { type: 'array', items: { enum: names } } },
	required: ['categories'],
	additionalProperties: false,
});

const instructionsOf = (
	categories: ReadonlyArray<{ readonly output: string; readonly description?: string }>,
	multiple: boolean,
	extra: string | undefined,
) =>
	[
		`Classify the text the user gives into ${multiple ? 'every category that applies' : 'the one category that fits best'}.`,
		'Categories:',
		...categories.map(
			({ output, description }) => `- ${output}${description ? `: ${description}` : ''}`,
		),
		'List no category when none fits. Do not explain.',
		...(extra ? [extra] : []),
	].join('\n');

export const classifyText = ai.action('classify', {
	action: 'Classify text',
	summary:
		'Route each item to the output of the category a chat model picks for its text, e.g. its sentiment.',
	flow: { effect: 'transform', cardinality: '1:N' },
	input: {
		model: supplied('chatModel'),
		text: str().with({ minLength: 1 }).hint('The text to classify'),
		categories: arr(
			obj({
				output: str().with({ minLength: 1 }).hint('The category name; the output has this name'),
				description: str().optional().hint('When the category applies'),
			}),
		).with({ minItems: 1 }),
		multiple: bool().default(false).hint('An item may go to more than one category'),
		system: str().optional().hint('More instructions for the model'),
	},
	outputs: { each: 'categories', then: [OTHER] },
	output: passedItem(),
	async *run({ input, item }) {
		const names = input.categories.map(({ output }) => output);
		// Before the model call: n8n checks output names only after the run.
		if (names.includes(OTHER)) {
			throw new Error(
				`No category can be named "${OTHER}": that output takes the items that fit none`,
			);
		}
		const schema = categorySchema(names);
		const reply = await input.model.chat({
			messages: promptMessages(
				instructionsOf(input.categories, input.multiple, input.system),
				input.text,
			),
			output: schema,
		});
		assertFinished(reply, input.model.model);
		// `parseReply` checked each name against the categories.
		const { categories } = parse(picked, parseReply(reply, schema));
		const chosen = [...new Set(categories)];
		const routes = input.multiple ? chosen : chosen.slice(0, 1);
		if (routes.length === 0) {
			yield { to: OTHER, item };
			return;
		}
		for (const to of routes) yield { to, item };
	},
});
