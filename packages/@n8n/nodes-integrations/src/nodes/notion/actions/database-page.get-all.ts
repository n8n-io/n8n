import {
	pages,
	path,
	readAllAs,
	Schema,
	t,
	type Infer,
	type JsonSchema,
	type ObjectOf,
	type ResourceField,
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
	const { json } = t
		.variant('op', {
			...Object.fromEntries(
				valueOps.map((op): [string, Shape] => [op, { value: value.title('Value') }]),
			),
			...Object.fromEntries(valueless.map((op): [string, Shape] => [op, {}])),
		})
		.title('Condition');
	return new Schema(json, false);
}

const text = ops(
	['equals', 'does_not_equal', 'contains', 'does_not_contain', 'starts_with', 'ends_with'],
	t.str(),
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
	t.num(),
	VALUELESS,
);
const checkbox = ops(['equals', 'does_not_equal'], t.bool());
const option = ops(['equals', 'does_not_equal'], t.str().hint('Option name'), VALUELESS);
const membership = (hint: string) =>
	ops(['contains', 'does_not_contain'], t.str().hint(hint), VALUELESS);
const date = ops(
	['equals', 'before', 'after', 'on_or_before', 'on_or_after'],
	t.str().hint('ISO 8601 date, e.g. 2026-09-01'),
	[...VALUELESS, ...RELATIVE],
);

const property = t.str().title('Property Name').hint('Exact Notion property name');

const condition = t
	.variant('type', {
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
	})
	.hint('type is the Notion property type');

type Condition = Infer<typeof condition>;

const direction = t.oneOf('ascending', 'descending').title('Direction');
const conditions = t.arr(condition).with({ minItems: 1 }).title('Conditions');

const input = {
	where: t
		.variant('match', { all: { conditions }, ['any']: { conditions } })
		.title('Filters')
		.hint('all = AND, any = OR')
		.optional(),
	limit: t.int().with({ minimum: 1 }).title('Limit').hint('Omit for every page').optional(),
	sort: t
		.arr(
			t.variant('by', {
				property: { property, direction },
				timestamp: {
					timestamp: t.oneOf('created_time', 'last_edited_time').title('Timestamp'),
					direction,
				},
			}),
		)
		.title('Sort')
		.optional(),
};

// A user names a database property, also one called "... ID", so `id` must not read as one.
const page = t
	.obj({
		id: t.str().with({ format: 'uuid' }).hint('Notion page UUID, not a database property'),
		name: t.str().hint('The page title'),
		url: t.str().with({ format: 'uri' }),
	})
	.with({
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
const queryPage = t
	.obj({
		results: t.arr(t.jsonValue()),
		has_more: t.bool().optional(),
		next_cursor: t.nullable(t.str()).optional(),
	})
	.with({ additionalProperties: true });

const LEGACY_PROPERTIES = {
	nodeType: 'n8n-nodes-base.notion',
	methodName: 'getFilterProperties',
	parameters: { resource: 'databasePage', operation: 'getAll' },
};

export const getManyDatabasePages = databasePage.action('getAll', {
	minor: 3,
	action: 'Get many database pages',
	summary: 'List pages of a Notion database, optionally filtered and sorted.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	scopes: ['content:read'],
	input,
	output: page,
	deriveOutput,
	resourceOutput: {
		method: 'notion.dataSourceProperties',
		input: 'database',
		// v3 reads a data source ID and v2.2 a database ID; the action accepts both.
		loadOptions: [
			{ ...LEGACY_PROPERTIES, version: 3, idParameter: 'dataSourceId' },
			{ ...LEGACY_PROPERTIES, version: 2.2, idParameter: 'databaseId' },
		],
		toOutput: outputFromProperties,
	},
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
		yield* pages(http, {
			page: queryPage,
			request: (cursor, room) => ({
				method: 'POST',
				path: path`/data_sources/${dataSourceId}/query`,
				headers: NOTION_VERSION,
				body: {
					...body,
					page_size: Math.min(room ?? 100, 100),
					...(cursor ? { start_cursor: cursor } : {}),
				},
			}),
			// Each page is an output, so the host warns about a field in another shape.
			items: (response) =>
				readAllAs(page, response.results.map(simplifyPage)).map(({ value }) => value),
			// Like v3, a missing `has_more` does not end the list.
			next: (response) => (response.has_more === false ? undefined : response.next_cursor),
			limit,
		});
	},
});
