import { t, type Infer, type InputItem } from '@n8n/node-sdk';

import { itemsNode } from '../items.node';
import { getPath, pathOf } from '../path';

const field = t.str().with({ minLength: 1 });
const counted = {
	field,
	includeEmpty: t.bool().default(false).hint('Count null and empty values'),
};

const summary = t.variant('aggregation', {
	append: counted,
	concatenate: { ...counted, separator: t.str().default(',') },
	count: counted,
	countUnique: counted,
	sum: { field },
	average: { field },
	min: { field },
	max: { field },
});

type Summary = Infer<typeof summary>;

const PREFIX: Readonly<Record<Summary['aggregation'], string>> = {
	append: 'appended_',
	concatenate: 'concatenated_',
	count: 'count_',
	countUnique: 'unique_count_',
	sum: 'sum_',
	average: 'average_',
	min: 'min_',
	max: 'max_',
};

const isEmpty = (value: unknown) => value === undefined || value === null || value === '';

/** `order.total` → `order_total`, the output name rule of the legacy node. */
const outputName = (name: string) => name.replace(/[\]["]/g, '').replace(/[ .]/g, '_');

function summarize(items: readonly InputItem[], entry: Summary): unknown {
	const path = pathOf(entry.field);
	const values = items.map((item) => getPath(item.json, path));
	const counts = 'includeEmpty' in entry && entry.includeEmpty === true;
	const present = counts ? values : values.filter((value) => !isEmpty(value));
	const numbers = values.filter((value): value is number => typeof value === 'number');
	const ordered = present.filter((value) => !isEmpty(value));
	switch (entry.aggregation) {
		case 'append':
			return present;
		case 'concatenate':
			return present
				.map((value) =>
					typeof value === 'string' ? value : (JSON.stringify(value) ?? 'undefined'),
				)
				.join(entry.separator ?? ',');
		case 'count':
			return present.length;
		case 'countUnique':
			return new Set(present).size;
		case 'sum':
			return numbers.reduce((total, value) => total + value, 0);
		case 'average':
			return numbers.reduce((total, value) => total + value, 0) / numbers.length;
		case 'min':
		case 'max': {
			const pick = (best: unknown, value: unknown) =>
				best === undefined ||
				(entry.aggregation === 'min' ? lower(value, best) : lower(best, value))
					? value
					: best;
			return ordered.reduce<unknown>(pick, undefined) ?? null;
		}
	}
}

const lower = (a: unknown, b: unknown) =>
	typeof a === 'string' && typeof b === 'string' ? a < b : Number(a) < Number(b);

/** The group key: an object value compares as its JSON. */
const groupKey = (value: unknown) =>
	value !== null && typeof value === 'object' ? JSON.stringify(value) : value;

interface Group {
	readonly keys: ReadonlyArray<readonly [string, unknown]>;
	readonly items: readonly InputItem[];
}

function groupsOf(items: readonly InputItem[], by: readonly string[], skipEmpty: boolean): Group[] {
	const [first, ...rest] = by;
	if (first === undefined) return [{ keys: [], items }];
	const path = pathOf(first);
	const groups = new Map<unknown, InputItem[]>();
	for (const item of items) {
		const key = groupKey(getPath(item.json, path));
		if (skipEmpty && typeof key !== 'number' && !key) continue;
		const members = groups.get(key);
		if (members) members.push(item);
		else groups.set(key, [item]);
	}
	return [...groups].flatMap(([key, members]) =>
		groupsOf(members, rest, skipEmpty).map((group) => ({
			keys: [[outputName(first), key] as const, ...group.keys],
			items: group.items,
		})),
	);
}

export const summarizeItems = itemsNode.action('summarize', {
	action: 'Summarize items',
	summary:
		'Count, sum, or list field values of all items, like a pivot table, optionally by group.',
	flow: { effect: 'transform', cardinality: 'batch' },
	input: {
		fields: t.arr(summary).with({ minItems: 1 }),
		groupBy: t.arr(field).default([]).hint('Fields whose values form the groups'),
		output: t
			.oneOf('separateItems', 'singleItem')
			.default('separateItems')
			.hint('singleItem nests groups by value in one item'),
		skipEmptyGroups: t.bool().default(false),
	},
	output: t.json(),
	run({ input, items }) {
		const groups = groupsOf(items, input.groupBy, input.skipEmptyGroups);
		const totals = (group: Group) =>
			Object.fromEntries(
				input.fields.map((entry) => [
					outputName(`${PREFIX[entry.aggregation]}${entry.field}`),
					summarize(group.items, entry),
				]),
			);
		if (input.output === 'separateItems') {
			return groups.map((group) => ({
				json: { ...totals(group), ...Object.fromEntries(group.keys) },
				from: group.items,
			}));
		}
		const nested = groups.reduce<Record<string, unknown>>((result, group) => {
			const path = group.keys.map(([, key]) => String(key));
			return nestIn(result, path, totals(group));
		}, {});
		return [{ json: nested, from: items }];
	},
});

const nestIn = (
	target: Record<string, unknown>,
	[key, ...rest]: readonly string[],
	value: Record<string, unknown>,
): Record<string, unknown> => {
	if (key === undefined) return value;
	const child = target[key];
	const inner =
		typeof child === 'object' && child !== null && !Array.isArray(child) ? { ...child } : {};
	return { ...target, [key]: nestIn(inner, rest, value) };
};
