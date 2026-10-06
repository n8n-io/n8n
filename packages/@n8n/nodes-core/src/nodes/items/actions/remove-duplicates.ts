import { t, type InputItem } from '@n8n/node-sdk';

import { itemsNode } from '../items.node';
import { canonical, getPath, pathOf, unsetPath } from '../path';

const fields = { fields: t.arr(t.str().with({ minLength: 1 })).with({ minItems: 1 }) };

export const removeDuplicates = itemsNode.action('removeDuplicates', {
	action: 'Remove duplicate items',
	summary: 'Keep the first item of each set of equal items. Items pass on unchanged.',
	flow: { effect: 'transform', cardinality: 'batch' },
	input: {
		compare: t
			.variant('mode', { all: {}, allExcept: fields, selected: fields })
			.default({ mode: 'all' })
			.hint('The fields that make two items equal'),
	},
	output: t.passedItem(),
	run({ input, items }) {
		const { compare } = input;
		const paths = compare.mode === 'all' ? [] : compare.fields.map(pathOf);
		const keyOf = (item: InputItem) =>
			canonical(
				compare.mode === 'all'
					? item.json
					: compare.mode === 'allExcept'
						? paths.reduce(unsetPath, item.json)
						: paths.map((path) => getPath(item.json, path)),
			);
		const seen = new Set<string>();
		return items.flatMap((item) => {
			const key = keyOf(item);
			if (seen.has(key)) return [];
			seen.add(key);
			return [{ item }];
		});
	},
});
