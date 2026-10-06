import { t, type InputItem } from '@n8n/node-sdk';

// Field paths and value keys are the ones of the items actions. An SDK path helper would serve both.
import { canonical, getPath, pathOf } from '../../items/path';
import { INPUTS, merge, mergeJson } from '../merge.node';

const field = t.str().with({ minLength: 1 }).hint('Field path, e.g. id or customer.id');

export const combineItems = merge.action('combine', {
	action: 'Combine items',
	summary:
		'Join left and right items into one item: by position, by equal field values, or every pair.',
	flow: { effect: 'transform', cardinality: 'batch' },
	inputs: INPUTS,
	input: {
		by: t
			.variant('by', {
				position: {
					unpaired: t
						.bool()
						.default(false)
						.title('Include Any Unpaired Items')
						.hint('Keep an item that has no partner at its position'),
				},
				fields: {
					left: field.title('Input 1 Field'),
					right: field.title('Input 2 Field'),
					join: t
						.oneOf('inner', 'left', 'right', 'outer', 'leftOnly', 'rightOnly')
						.default('inner')
						.title('Output Type')
						.hint('left/right/outer keep unmatched items; leftOnly/rightOnly keep only those'),
				},
				all: {},
			})
			.title('Combine By')
			.hint('position pairs item i; fields pairs equal values; all pairs every left and right'),
		prefer: t
			.oneOf('left', 'right')
			.optional()
			.title('When Field Values Clash')
			.hint('Which value wins a field clash. Default: right; left in a right join'),
	},
	output: t.json().hint('The fields of both items'),
	*run({ input, inputs }) {
		const { left, right } = inputs;
		const { by } = input;
		const joined = (a: InputItem, b: InputItem, prefer: 'left' | 'right') =>
			prefer === 'right' ? mergeJson(a.json, b.json) : mergeJson(a.json, b.json, a.json);
		if (by.by === 'all') {
			const prefer = input.prefer ?? 'right';
			yield* left.flatMap((a) => right.map((b) => ({ json: joined(a, b, prefer), from: [a, b] })));
			return;
		}
		if (by.by === 'position') {
			const prefer = input.prefer ?? 'right';
			const count = by.unpaired
				? Math.max(left.length, right.length)
				: Math.min(left.length, right.length);
			yield* Array.from({ length: count }, (_, index) => {
				const pair = [left[index], right[index]].filter((item) => item !== undefined);
				const [a = { json: {} }, b = { json: {} }] = [left[index], right[index]];
				return { json: joined(a, b, prefer), from: pair };
			});
			return;
		}
		const { join } = by;
		// The Merge node lets left values win in a right join.
		const prefer = input.prefer ?? (join === 'right' ? 'left' : 'right');
		const [leftPath, rightPath] = [pathOf(by.left), pathOf(by.right)];
		// One pass over right, so a join reads each item once.
		const partners = right.reduce((index, item) => {
			const value = getPath(item.json, rightPath);
			if (value === undefined) return index;
			const key = canonical(value);
			const list = index.get(key);
			if (list) list.push(item);
			else index.set(key, [item]);
			return index;
		}, new Map<string, InputItem[]>());
		const matched = new Set<InputItem>();
		const pairs = left.map((item) => {
			const value = getPath(item.json, leftPath);
			const found = value === undefined ? [] : (partners.get(canonical(value)) ?? []);
			found.forEach((partner) => matched.add(partner));
			return { item, found };
		});
		if (join !== 'leftOnly' && join !== 'rightOnly') {
			// A right join lists the right item first, as the Merge node does.
			yield* pairs.flatMap(({ item, found }) =>
				found.map((partner) => ({
					json: joined(item, partner, prefer),
					from: join === 'right' ? [partner, item] : [item, partner],
				})),
			);
		}
		if (join === 'left' || join === 'outer' || join === 'leftOnly') {
			yield* pairs.filter(({ found }) => found.length === 0).map(({ item }) => ({ item }));
		}
		if (join === 'right' || join === 'outer' || join === 'rightOnly') {
			yield* right.filter((item) => !matched.has(item)).map((item) => ({ item }));
		}
	},
});
