import { arr, bool, json, obj, str, variant } from '@n8n/node-sdk';

import { core } from '../core.node';
import { getPath, pathOf, setPath } from '../path';

export const aggregateItems = core.action('aggregate', {
	patch: 1,
	action: 'Aggregate items',
	summary: 'Combine all items into one item: lists of field values, or the list of all items.',
	flow: { effect: 'transform', cardinality: 'batch' },
	input: {
		aggregate: variant('mode', {
			fields: {
				fields: arr(
					obj({
						field: str().with({ minLength: 1 }),
						as: str()
							.with({ minLength: 1 })
							.optional()
							.hint('Output field; default: last path part'),
					}),
				).with({ minItems: 1 }),
				keepMissing: bool().default(false).hint('Keep null and missing values'),
				mergeLists: bool().default(false).hint('Put the entries of list values in one list'),
			},
			items: { into: str().with({ minLength: 1 }).default('data') },
		}),
	},
	output: json(),
	run({ input, items }) {
		const { aggregate } = input;
		if (aggregate.mode === 'items') {
			// The output lists the input objects, it does not copy them.
			return [{ json: { [aggregate.into]: items.map((item) => item.json) }, from: items }];
		}
		const { keepMissing, mergeLists } = aggregate;
		const outputs = aggregate.fields.map(({ field, as }) => ({
			path: pathOf(field),
			target: as ?? pathOf(field).at(-1) ?? field,
		}));
		const repeated = outputs.find(
			({ target }, index) => outputs.findIndex((other) => other.target === target) !== index,
		);
		if (repeated) throw new Error(`The '${repeated.target}' output field is used more than once`);
		const values = (path: readonly string[]) =>
			items.flatMap((item) => {
				const value = getPath(item.json, path);
				const kept = keepMissing
					? value
					: Array.isArray(value)
						? value.filter((entry) => entry !== null)
						: value;
				if (!keepMissing && (kept === null || kept === undefined)) return [];
				return mergeLists && Array.isArray(kept) ? kept : [kept];
			});
		const aggregated = outputs.reduce<Record<string, unknown>>(
			(result, { path, target }) => setPath(result, pathOf(target), values(path)),
			{},
		);
		return [{ json: aggregated, from: items }];
	},
});
