import { t, UserError, type InputItem } from '@n8n/node-sdk';

import { itemsNode } from '../items.node';
import { canonical, getPath, pathOf } from '../path';

/** Strings compare without case; other values compare as numbers, as lodash `lt` does. */
const sortable = (value: unknown) => (typeof value === 'string' ? value.toLowerCase() : value);

const lessThan = (a: unknown, b: unknown) =>
	typeof a === 'string' && typeof b === 'string' ? a < b : Number(a) < Number(b);

/** Deep equality only for objects: most sort values are text or numbers. */
const same = (a: unknown, b: unknown) =>
	a === b ||
	(typeof a === 'object' &&
		typeof b === 'object' &&
		a !== null &&
		b !== null &&
		canonical(a) === canonical(b));

interface Row {
	readonly item: InputItem;
	readonly values: readonly unknown[];
}

export const sortItems = itemsNode.action('sort', {
	action: 'Sort items',
	summary: 'Sort all items by fields, in order. Text sorts without case. Items pass on unchanged.',
	flow: { effect: 'transform', cardinality: 'batch' },
	input: {
		by: t
			.arr(
				t.obj({
					field: t.str().with({ minLength: 1 }),
					order: t.oneOf('ascending', 'descending').default('ascending'),
				}),
			)
			.with({ minItems: 1 }),
	},
	ui: { fields: { by: { widget: 'list' } } },
	output: t.passedItem(),
	run({ input, items }) {
		const keys = input.by.map(({ field, order }) => ({
			field,
			path: pathOf(field),
			direction: order === 'descending' ? -1 : 1,
		}));
		const missing = keys.find(({ path }) =>
			items.every((item) => getPath(item.json, path) === undefined),
		);
		if (missing)
			throw new UserError(`Couldn't find the field '${missing.field}' in the input data`);
		// Each item reads its sort values once, not once per comparison.
		const rows = items.map((item) => ({
			item,
			values: keys.map(({ path }) => sortable(getPath(item.json, path))),
		}));
		const compare = (a: Row, b: Row) => {
			const index = keys.findIndex((_key, at) => !same(a.values[at], b.values[at]));
			if (index < 0) return 0;
			const direction = keys[index]?.direction ?? 1;
			return (lessThan(a.values[index], b.values[index]) ? -1 : 1) * direction;
		};
		return rows.sort(compare).map(({ item }) => ({ item }));
	},
});
