import {
	arr,
	bool,
	int,
	jsonValue,
	matches,
	nullable,
	num,
	obj,
	oneOf,
	pages,
	str,
	validate,
	variant,
	type Infer,
	type JsonSchema,
	type ObjectOf,
	type ResourceField,
	Schema,
	type Shape,
} from '@n8n/node-sdk';

import { dataSourceOf, NOTION_VERSION } from '../data-source';
import { databasePage, notionIdOf } from '../notion.node';
import { SIMPLIFIED, simplifyPage, snakeCase } from '../simplify';

/** Conditions that test presence or a relative period take no value. */
const VALUELESS = ['is_empty', 'is_not_empty'] as const;
const RELATIVE = [
	'past_week',
	'past_month',
	'past_year',
	'this_week',
	'next_week',
	'next_month',
	'next_year',
] as const;

/** Operators as a variant: value operators take `value`, the rest take nothing. */
function ops<V extends string, T, E extends string = (typeof VALUELESS)[number]>(
	valueOps: readonly V[],
	value: Schema<T>,
	valueless: readonly E[] = [],
): Schema<{ op: V; value: T } | { op: E }> {
	const { json } = variant('op', {
		...Object.fromEntries(valueOps.map((op): [string, Shape] => [op, { value }])),
		...Object.fromEntries(valueless.map((op): [string, Shape] => [op, {}])),
	});
	return new Schema(json, false);
}

const text = ops(
	['equals', 'does_not_equal', 'contains', 'does_not_contain', 'starts_with', 'ends_with'],
	str(),
	VALUELESS,
);
const numeric = ops(
	[
		'equals',
		'does_not_equal',
		'greater_than',
		'less_than',
		'greater_than_or_equal_to',
		'less_than_or_equal_to',
	],
	num(),
	VALUELESS,
);
const checkbox = ops(['equals', 'does_not_equal'], bool());
const option = ops(['equals', 'does_not_equal'], str().hint('Option name'), VALUELESS);
const membership = (hint: string) =>
	ops(['contains', 'does_not_contain'], str().hint(hint), VALUELESS);
const date = ops(
	['equals', 'before', 'after', 'on_or_before', 'on_or_after'],
	str().hint('ISO 8601 date, e.g. 2026-09-01'),
	[...VALUELESS, ...RELATIVE],
);

const property = str().hint('Exact Notion property name');

const condition = variant('type', {
	title: { property, condition: text },
	rich_text: { property, condition: text },
	email: { property, condition: text },
	url: { property, condition: text },
	phone_number: { property, condition: text },
	['number']: { property, condition: numeric },
	checkbox: { property, condition: checkbox },
	select: { property, condition: option },
	status: { property, condition: option },
	multi_select: { property, condition: membership('Option name') },
	people: { property, condition: membership('Notion user ID (UUID); never an email or a name') },
	relation: { property, condition: membership('Related page ID') },
	date: { property, condition: date },
	created_time: { property, condition: date },
	last_edited_time: { property, condition: date },
}).hint('type is the Notion property type');

type Condition = Infer<typeof condition>;

const direction = oneOf('ascending', 'descending');

const input = {
	where: variant('match', {
		all: { conditions: arr(condition).with({ minItems: 1 }) },
		['any']: { conditions: arr(condition).with({ minItems: 1 }) },
	})
		.hint('all = AND, any = OR')
		.optional(),
	limit: int().with({ minimum: 1 }).hint('Omit for every page').optional(),
	sort: arr(
		variant('by', {
			property: { property, direction },
			timestamp: { timestamp: oneOf('created_time', 'last_edited_time'), direction },
		}),
	).optional(),
};

// A user names a database property, also one called "... ID", so `id` must not read as one.
const page = obj({
	id: str().with({ format: 'uuid' }).hint('Notion page UUID, not a database property'),
	name: str().hint('The page title'),
	url: str().with({ format: 'uri' }),
}).with({
	patternProperties: {
		'^property_[a-z0-9_]+$': {
			'x-n8n-hint':
				'property_ + snake_case of the property name, e.g. "Order ID": property_order_id',
		},
	},
	'x-n8n-value-types': SIMPLIFIED,
});

const TIMESTAMPS = new Set(['created_time', 'last_edited_time']);

function toNotionFilter({ type, property: name, condition: test }: Condition) {
	const value = 'value' in test ? test.value : RELATIVE.some((op) => op === test.op) ? {} : true;
	return TIMESTAMPS.has(type)
		? { timestamp: type, [type]: { [test.op]: value } }
		: { property: name, [type]: { [test.op]: value } };
}

/** Under `all`, a condition that compares against a value only matches pages that have one. */
function guarantees(where: Infer<typeof input.where> | undefined): Array<[string, JsonSchema]> {
	if (!where) return [];
	return where.conditions.flatMap((item): Array<[string, JsonSchema]> => {
		const schema = SIMPLIFIED[item.type];
		if (!schema) return [];
		const present =
			where.match === 'all' &&
			'value' in item.condition &&
			!item.condition.op.startsWith('does_not');
		const typed = present ? (schema.anyOf?.[0] ?? schema) : schema;
		// An equality filter fixes the value every matching page has.
		const fixed =
			item.condition.op === 'equals' && 'value' in item.condition
				? { examples: [item.condition.value] }
				: {};
		return [[`property_${snakeCase(item.property)}`, { ...typed, ...fixed }]];
	});
}

type Parameters = ObjectOf<typeof input>;

function deriveOutput(parameters: Parameters): JsonSchema {
	const typed = guarantees(parameters.where);
	return {
		...page.json,
		properties: { ...page.json.properties, ...Object.fromEntries(typed) },
		required: [...(page.json.required ?? []), ...typed.map(([key]) => key)],
	};
}

/**
 * Types every property of the data source and closes the key space, so a misspelled property
 * key fails `tsc`. Filter-derived types win because they know presence. A property type without
 * a simplified value stays optional: the simplified page can omit it.
 */
function outputFromProperties(
	fields: readonly ResourceField[],
	parameters: Parameters,
): JsonSchema {
	const derived = deriveOutput(parameters);
	const known = derived.properties ?? {};
	// The lookup encodes each field as `<property name>|<Notion type>`.
	const typed = fields
		.map(({ name, value }) => ({
			key: `property_${snakeCase(name)}`,
			schema: SIMPLIFIED[String(value).split('|').pop() ?? ''],
		}))
		.filter(({ key }) => !(key in known));
	const { patternProperties: _open, 'x-n8n-value-types': _valueTypes, ...closed } = derived;
	return {
		...closed,
		properties: {
			...known,
			...Object.fromEntries(typed.map(({ key, schema }) => [key, schema ?? {}])),
		},
		required: [
			...(derived.required ?? []),
			...typed.flatMap(({ key, schema }) => (schema ? [key] : [])),
		],
	};
}

/** One page of a data source query: each result is simplified before it is checked. */
const queryPage = obj({
	results: arr(jsonValue()),
	has_more: bool().optional(),
	next_cursor: nullable(str()).optional(),
}).with({ additionalProperties: true });

export const getManyDatabasePages = databasePage.action('getAll', {
	minor: 2,
	patch: 2,
	action: 'Get many database pages',
	summary: 'List pages of a Notion database, optionally filtered and sorted.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	scopes: ['content:read'],
	input,
	output: page,
	deriveOutput,
	resourceOutput: { method: 'notion.dataSourceProperties', toOutput: outputFromProperties },
	async *run({ input: parameters, http }) {
		const dataSourceId = await dataSourceOf(http, notionIdOf(parameters.database));
		const { where, limit, sort } = parameters;
		const filters = (where?.conditions ?? []).map(toNotionFilter);
		const body = {
			...(filters.length ? { filter: { [where?.match === 'any' ? 'or' : 'and']: filters } } : {}),
			...(sort?.length
				? {
						sorts: sort.map((entry) =>
							entry.by === 'timestamp'
								? { timestamp: entry.timestamp, direction: entry.direction }
								: { property: entry.property, direction: entry.direction },
						),
					}
				: {}),
		};
		const results = pages(http, {
			page: queryPage,
			request: (cursor, room) => ({
				method: 'POST',
				path: `/data_sources/${dataSourceId}/query`,
				headers: NOTION_VERSION,
				body: {
					...body,
					page_size: Math.min(room ?? 100, 100),
					...(cursor ? { start_cursor: cursor } : {}),
				},
			}),
			items: (response) => response.results,
			// Like v3, a missing `has_more` does not end the list.
			next: (response) => (response.has_more === false ? undefined : response.next_cursor),
			limit,
		});
		for await (const result of results) {
			const simplified = simplifyPage(result);
			if (!matches(page, simplified)) {
				const issues = validate(simplified, page.json, { path: 'page' });
				throw new Error(`Notion returned a page in another shape: ${issues.join('; ')}`);
			}
			yield simplified;
		}
	},
});
