import { t } from '@n8n/node-sdk';

import { core } from '../core.node';
import { getPath, pathOf, setPath, unsetPath } from '../path';

const field = () => t.str().with({ minLength: 1 });

export const renameKeys = core.action('renameKeys', {
	action: 'Rename keys',
	summary:
		'Move fields of each item to new names. A name is a dot path; a missing field is skipped.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: {
		keys: t.arr(t.obj({ from: field(), to: field() })).with({ minItems: 1 }),
	},
	output: t.json(),
	async run({ input, item }) {
		const renamed = input.keys.reduce<Readonly<Record<string, unknown>>>((result, { from, to }) => {
			const [source, target] = [pathOf(from), pathOf(to)];
			// Each value comes from the input item, so one rename never feeds the next.
			const value = getPath(item.json, source);
			if (value === undefined || from === to) return result;
			return unsetPath(setPath(result, target, value), source);
		}, item.json);
		return await Promise.resolve(renamed);
	},
});
