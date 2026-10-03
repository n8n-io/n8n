import { isRecord, t } from '@n8n/node-sdk';

import { itemsNode } from '../items.node';
import { getPath, pathOf, setPath, unsetPath } from '../path';

/** A list stays a list, an object gives its values, and another value is a list of one. */
const entriesOf = (value: unknown): readonly unknown[] =>
	value === undefined
		? []
		: Array.isArray(value)
			? value
			: isRecord(value)
				? Object.values(value)
				: [value];

export const splitOut = itemsNode.action('splitOut', {
	action: 'Split out a list',
	summary: 'Emit one item for each entry of a list field of each item.',
	flow: { effect: 'transform', cardinality: '1:N' },
	input: {
		field: t.str().with({ minLength: 1 }).hint('Dot path to the list, e.g. order.lines'),
		into: t
			.str()
			.with({ minLength: 1 })
			.optional()
			.hint('Output field of each entry; default: an object entry is the item'),
		include: t
			.variant('mode', { none: {}, all: {}, selected: { fields: t.arr(t.str()) } })
			.default({ mode: 'none' })
			.hint('Other input fields to copy to each item'),
	},
	output: t.json(),
	async *run({ input, item }) {
		const { field, into, include } = input;
		const path = pathOf(field);
		const target = into === undefined ? undefined : pathOf(into);
		const others =
			include.mode === 'all'
				? unsetPath(item.json, path)
				: include.mode === 'selected'
					? Object.fromEntries(
							include.fields.map((name) => [name, getPath(item.json, pathOf(name))]),
						)
					: {};
		for (const entry of entriesOf(getPath(item.json, path))) {
			const own =
				target !== undefined
					? setPath({}, target, entry)
					: include.mode === 'none' && isRecord(entry)
						? entry
						: { [field]: entry };
			yield { ...others, ...own };
		}
	},
});
