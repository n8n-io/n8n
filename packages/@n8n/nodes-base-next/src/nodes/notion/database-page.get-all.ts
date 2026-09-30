import {
	arr,
	bool,
	defineAction,
	int,
	matches,
	num,
	obj,
	oneOf,
	ref,
	str,
	variant,
	type Infer,
	type JsonSchema,
	Schema,
	type Shape,
} from '@n8n/node-sdk';

import {
	dataSourceOf,
	notion,
	notionDatabase,
	notionIdOf,
	NOTION_VERSION,
	SIMPLIFIED,
	simplifyPage,
	snakeCase,
} from './node';

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
	database: ref(notionDatabase),
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

const page = obj({ id: str(), name: str().hint('The page title'), url: str() }).with({
	patternProperties: { '^property_': {} },
	'x-n8n-value-types': SIMPLIFIED,
	'x-n8n-hint': 'Keys: property_ + snake_case of the exact property name',
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
		return [
			[`property_${snakeCase(item.property)}`, present ? (schema.anyOf?.[0] ?? schema) : schema],
		];
	});
}

export const getManyDatabasePages = defineAction({
	node: notion,
	id: 'notion.databasePage.getAll',
	action: 'Get many database pages',
	summary: 'List pages of a Notion database, optionally filtered and sorted.',
	flow: { effect: 'read', cardinality: '1:N', passthrough: 'replace', idempotent: true },
	input,
	output: page,
	deriveOutput(parameters) {
		const typed = guarantees(parameters.where);
		return {
			...page.json,
			properties: { ...page.json.properties, ...Object.fromEntries(typed) },
			required: [...(page.json.required ?? []), ...typed.map(([key]) => key)],
		};
	},
	async run({ input: parameters, http, emit }) {
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
			page_size: Math.min(limit ?? 100, 100),
		};
		const fetchPages = async (cursor: string | undefined, emitted: number): Promise<void> => {
			const response = await http.request({
				method: 'POST',
				path: `/data_sources/${dataSourceId}/query`,
				headers: NOTION_VERSION,
				body: cursor ? { ...body, start_cursor: cursor } : body,
			});
			const record = typeof response === 'object' && response !== null ? response : {};
			const results = 'results' in record && Array.isArray(record.results) ? record.results : [];
			const room = limit === undefined ? results.length : Math.max(limit - emitted, 0);
			for (const result of results.slice(0, room)) {
				const simplified = simplifyPage(result);
				if (!matches(page, simplified)) throw new Error('Notion returned a page without id or url');
				emit(simplified);
			}
			const next =
				'next_cursor' in record && typeof record.next_cursor === 'string'
					? record.next_cursor
					: undefined;
			const count = emitted + Math.min(room, results.length);
			if (next && (limit === undefined || count < limit)) await fetchPages(next, count);
		};
		await fetchPages(undefined, 0);
	},
});
