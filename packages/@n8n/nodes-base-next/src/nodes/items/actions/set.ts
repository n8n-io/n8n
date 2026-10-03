import { t } from '@n8n/node-sdk';

import { itemsNode } from '../items.node';
import { getPath, pathOf, setPath, unsetPath } from '../path';

const names = { fields: t.arr(t.str()) };

export const editFields = itemsNode.action('set', {
	action: 'Edit fields',
	summary: 'Set fields on each item. A field name is a dot path; a value keeps its JSON type.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: {
		fields: t.record(t.jsonValue()).hint('Field path to value, e.g. { "user.name": "Ada" }'),
		include: t
			.variant('mode', { none: {}, all: {}, selected: names, except: names })
			.default({ mode: 'none' })
			.hint('Input fields to keep beside the set fields'),
	},
	output: t.json(),
	async run({ input, item }) {
		const { include } = input;
		const kept =
			include.mode === 'all'
				? item.json
				: include.mode === 'selected'
					? include.fields.reduce<Readonly<Record<string, unknown>>>((picked, field) => {
							const path = pathOf(field);
							const value = getPath(item.json, path);
							return value === undefined ? picked : setPath(picked, path, value);
						}, {})
					: include.mode === 'except'
						? include.fields.reduce((rest, field) => unsetPath(rest, pathOf(field)), item.json)
						: {};
		return await Promise.resolve(
			Object.entries(input.fields).reduce(
				(result, [field, value]) => setPath(result, pathOf(field), value),
				kept,
			),
		);
	},
});
