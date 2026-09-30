import { bool, num, obj, openObj, record, resourceLocator, str, tagOf, variant } from '../helpers';
import type { ActionContract, ContractInput, JsonSchema, ResourceField } from '../types';

const CREDENTIALS = ['notionApi', 'notionOAuth2Api'];

/** Resource shapes, from nodes-base Notion/shared/constants.ts. */
const NOTION_ID_PATTERN = '[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}';
const NOTION_ID = str('a Notion ID: 32 hex digits, dashes optional', {
	pattern: `^${NOTION_ID_PATTERN}`,
});
const NOTION_PAGE_URL = str('a Notion page URL', {
	pattern: `^(?:https|http)://(?:www\\.notion\\.(?:so|com)|app\\.notion\\.com)/(?:p/)?(?:[a-z0-9-]{2,}/)?(?:[a-zA-Z0-9_-]{1,}-)?${NOTION_ID_PATTERN}`,
});

const TEXT_CONDITIONS = [
	'equals',
	'does_not_equal',
	'contains',
	'does_not_contain',
	'starts_with',
	'ends_with',
	'is_empty',
	'is_not_empty',
];
const NUMBER_CONDITIONS = [
	'equals',
	'does_not_equal',
	'greater_than',
	'less_than',
	'greater_than_or_equal_to',
	'less_than_or_equal_to',
];
const DATE_CONDITIONS = [
	'equals',
	'before',
	'after',
	'on_or_before',
	'on_or_after',
	'is_empty',
	'is_not_empty',
	'past_week',
	'past_month',
	'past_year',
	'this_week',
	'next_week',
	'next_month',
	'next_year',
];
const MEMBERSHIP_CONDITIONS = ['contains', 'does_not_contain', 'is_empty', 'is_not_empty'];
const OPTION_CONDITIONS = ['equals', 'does_not_equal', 'is_empty', 'is_not_empty'];

interface FilterFamily {
	types: string[];
	conditions: string[];
	/** The condition row key the v3 node reads the value from (`DataSourceFilters.ts`). */
	valueKey?: string;
	value?: JsonSchema;
}

/** Mirrors the v3 node's `CONDITION_OPTIONS` and `conditionValue`. */
const FILTER_FAMILIES: FilterFamily[] = [
	{
		types: ['title', 'rich_text', 'email', 'url', 'phone_number'],
		conditions: TEXT_CONDITIONS,
		valueKey: 'richTextValue',
		value: str(),
	},
	{
		types: ['number'],
		conditions: [...NUMBER_CONDITIONS, 'is_empty', 'is_not_empty'],
		valueKey: 'numberValue',
		value: num(),
	},
	{ types: ['unique_id'], conditions: NUMBER_CONDITIONS, valueKey: 'numberValue', value: num() },
	{
		types: ['checkbox'],
		conditions: ['equals', 'does_not_equal'],
		valueKey: 'checkboxValue',
		value: bool(),
	},
	{
		types: ['select', 'status'],
		conditions: OPTION_CONDITIONS,
		valueKey: 'optionValue',
		value: str('Option name'),
	},
	{
		types: ['multi_select'],
		conditions: MEMBERSHIP_CONDITIONS,
		valueKey: 'optionValue',
		value: str('Option name'),
	},
	{
		types: ['date', 'created_time', 'last_edited_time'],
		conditions: DATE_CONDITIONS,
		valueKey: 'dateValue',
		value: str('ISO 8601 date, e.g. 2026-09-01'),
	},
	{
		types: ['people', 'created_by', 'last_edited_by'],
		conditions: MEMBERSHIP_CONDITIONS,
		valueKey: 'peopleValue',
		value: str('Notion user ID (UUID); never an email or a name'),
	},
	{
		types: ['relation'],
		conditions: MEMBERSHIP_CONDITIONS,
		valueKey: 'relationValue',
		value: str('Related page ID'),
	},
	{ types: ['files'], conditions: ['is_empty', 'is_not_empty'] },
];

const VALUE_KEY_BY_TYPE = new Map(
	FILTER_FAMILIES.flatMap(({ types, valueKey }) => types.map((type) => [type, valueKey] as const)),
);

/** Conditions that test presence or a relative period. They take no value. */
const VALUELESS_CONDITIONS = new Set([
	'is_empty',
	'is_not_empty',
	'past_week',
	'past_month',
	'past_year',
	'this_week',
	'next_week',
	'next_month',
	'next_year',
]);

/** A value is required exactly for the operators that compare against one. */
function conditionVariant(conditions: string[], value?: JsonSchema): JsonSchema {
	return variant(
		'op',
		Object.fromEntries(
			conditions.map((op) => [
				op,
				value && !VALUELESS_CONDITIONS.has(op)
					? { properties: { value }, required: ['value'] }
					: {},
			]),
		),
	);
}

const filterCondition = variant(
	'type',
	Object.fromEntries(
		FILTER_FAMILIES.flatMap(({ types, conditions, value }) =>
			types.map((type) => [
				type,
				{
					properties: {
						property: str('Exact Notion property name'),
						condition: conditionVariant(conditions, value),
					},
					required: ['property', 'condition'],
				},
			]),
		),
	),
	{ 'x-n8n-hint': 'type is the Notion property type; for formula or rollup use filter mode json' },
);

const nullable = (schema: JsonSchema): JsonSchema => ({ anyOf: [schema, { type: 'null' }] });
const nonNull = (schema: JsonSchema): JsonSchema => schema.anyOf?.[0] ?? schema;
const strArray: JsonSchema = { type: 'array', items: { type: 'string' } };

/** Mirrors `simplifyProperty` in nodes-base Notion/shared/GenericFunctions.ts. */
const SIMPLIFIED_SCHEMA_BY_TYPE: Record<string, JsonSchema> = {
	title: str(),
	rich_text: str(),
	email: nullable(str()),
	url: nullable(str()),
	phone_number: nullable(str()),
	select: nullable(str()),
	status: nullable(str()),
	created_by: nullable(str()),
	last_edited_by: nullable(str()),
	['number']: nullable(num()),
	checkbox: bool(),
	created_time: str(),
	last_edited_time: str(),
	date: nullable(
		obj({ start: str(), end: nullable(str()), time_zone: nullable(str()) }, [
			'start',
			'end',
			'time_zone',
		]),
	),
	people: { type: 'array', items: { anyOf: [str(), { type: 'object', properties: {} }] } },
	multi_select: strArray,
	relation: strArray,
	files: strArray,
	formula: {},
	rollup: { anyOf: [num(), { type: 'array' }] },
};

const simplifiedPage: JsonSchema = {
	...obj({ id: str(), name: str('The page title'), url: str() }),
	patternProperties: { '^property_': { 'x-n8n-value-types': SIMPLIFIED_SCHEMA_BY_TYPE } },
	'x-n8n-hint': 'Keys: property_ + snake_case of the exact property name',
};

/** change-case v5 `snakeCase`, which the v3 node uses for simplified keys. */
const snakeCase = (name: string) =>
	name
		.replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
		.replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2')
		.split(/[^\p{L}\d]+/u)
		.filter(Boolean)
		.map((word) => word.toLowerCase())
		.join('_');

/**
 * Types every simplified property from the data source schema and closes the shape, so a
 * misspelled property key is a build error. Filter-derived types win: they know presence.
 */
function typeFromDataSource(
	fields: ResourceField[],
	input: ContractInput,
	derived: JsonSchema,
): JsonSchema {
	if (tagOf(input.output, 'mode') === 'raw') return derived;
	const typed = fields.flatMap(({ value }) => {
		const [name, type] = String(value).split('|');
		return name && type
			? [[`property_${snakeCase(name)}`, SIMPLIFIED_SCHEMA_BY_TYPE[type] ?? {}] as const]
			: [];
	});
	const { patternProperties: _open, ...closed } = derived;
	const properties = { ...Object.fromEntries(typed), ...derived.properties };
	return { ...closed, properties, required: Object.keys(properties) };
}

/** A filter condition names a property and its Notion type, so its simplified value has a known type. */
function deriveGetAllOutput(input: ContractInput): JsonSchema {
	if (tagOf(input.output, 'mode') === 'raw') return rawPage;
	const { match, conditions } =
		tagOf(input.filter, 'mode') === 'conditions' ? record(input.filter) : { conditions: [] };
	const typed = (Array.isArray(conditions) ? conditions : []).flatMap((condition) => {
		const { property, type } = record(condition);
		const operator = record(record(condition).condition).op;
		const schema = typeof type === 'string' ? SIMPLIFIED_SCHEMA_BY_TYPE[type] : undefined;
		if (typeof property !== 'string' || !schema) return [];
		// Under AND, a condition that needs a value only matches pages that have one.
		const present =
			match === 'all' && typeof operator === 'string' && !/^(is_empty|does_not_)/.test(operator);
		return [[`property_${snakeCase(property)}`, present ? nonNull(schema) : schema] as const];
	});
	return {
		...simplifiedPage,
		properties: { ...simplifiedPage.properties, ...Object.fromEntries(typed) },
		required: [...(simplifiedPage.required ?? []), ...typed.map(([key]) => key)],
	};
}

const rawPage = obj({
	object: str(),
	id: str(),
	url: str(),
	public_url: str(),
	created_time: str(),
	last_edited_time: str(),
	created_by: openObj(),
	last_edited_by: openObj(),
	archived: bool(),
	in_trash: bool(),
	icon: openObj(),
	cover: openObj(),
	parent: openObj(),
	properties: {
		type: 'object',
		additionalProperties: openObj({ id: str(), type: str() }),
		'x-n8n-hint': 'Keyed by exact property name; value nested under its type key',
	},
});

const outputMode = variant(
	'mode',
	{
		simplified: {
			hint: 'Flat items: property_<snake_case name> keys; see output for value types',
			output: simplifiedPage,
		},
		raw: {
			hint: 'Notion API page: $json.properties["Status"].status.name',
			output: rawPage,
		},
	},
	{ default: { mode: 'simplified' } },
);

const SORT_DIRECTION: JsonSchema = { enum: ['ascending', 'descending'] };

/** The node keeps only the part of `key` before `|`, so a bare name is enough. */
function compileSort(sort: unknown) {
	const rows = (Array.isArray(sort) ? sort : []).map((item) => {
		const { property, timestamp, direction } = record(item);
		return tagOf(item, 'by') === 'timestamp'
			? { timestamp: true, key: timestamp, direction }
			: { timestamp: false, key: property, direction };
	});
	return rows.length ? { sort: { sortValue: rows } } : {};
}

const simpleFlag = (input: ContractInput) => tagOf(input.output, 'mode') !== 'raw';

function compileFilter(filter: unknown) {
	const mode = tagOf(filter, 'mode') ?? 'none';
	const { match, conditions, json } = record(filter);
	if (mode === 'json') {
		return {
			filterType: 'json',
			filterJson: typeof json === 'string' ? json : JSON.stringify(json),
		};
	}
	if (mode !== 'conditions') return { filterType: 'none' };
	return {
		filterType: 'manual',
		matchType: match === 'all' ? 'allFilters' : 'anyFilter',
		filters: {
			conditions: (Array.isArray(conditions) ? conditions : []).map((item) => {
				const { property, type, condition } = record(item);
				const { op, value } = record(condition);
				const valueKey = VALUE_KEY_BY_TYPE.get(String(type));
				return {
					key: `${String(property)}|${String(type)}`,
					type,
					condition: op,
					...(valueKey && value !== undefined ? { [valueKey]: value } : {}),
				};
			}),
		},
	};
}

export const notionGetManyPages: ActionContract = {
	id: 'notion.databasePage.getAll',
	node: 'notion',
	action: 'Get many database pages',
	summary: 'List pages of a Notion database (data source), optionally filtered.',
	flow: { effect: 'read', cardinality: '1:N', passthrough: 'replace', idempotent: true },
	credentials: CREDENTIALS,
	input: obj(
		{
			database: variant('mode', {
				pick: {
					hint: 'User picks the database at setup; do not invent IDs',
					properties: { name: str('Name from the request, shown at setup') },
				},
				id: { properties: { id: NOTION_ID }, required: ['id'] },
			}),
			filter: variant(
				'mode',
				{
					none: {},
					conditions: {
						properties: {
							match: {
								enum: ['all', 'any'],
								'x-n8n-hint': 'all = AND, any = OR',
							},
							conditions: {
								type: 'array',
								minItems: 1,
								items: filterCondition,
							},
						},
						required: ['match', 'conditions'],
					},
					json: {
						properties: { json: { type: 'object', additionalProperties: true } },
						required: ['json'],
						hint: 'Raw Notion API filter object',
					},
				},
				{ default: { mode: 'none' } },
			),
			paging: variant('mode', {
				all: {},
				limit: { properties: { max: num({ default: 50 }) }, required: ['max'] },
			}),
			sort: {
				type: 'array',
				items: variant('by', {
					property: {
						properties: { property: str('Exact Notion property name'), direction: SORT_DIRECTION },
						required: ['property', 'direction'],
					},
					timestamp: {
						properties: {
							timestamp: { enum: ['created_time', 'last_edited_time'] },
							direction: SORT_DIRECTION,
						},
						required: ['timestamp', 'direction'],
					},
				}),
			},
			downloadFiles: bool({
				default: false,
				'x-n8n-hint': 'Download files properties as binary data',
			}),
			output: outputMode,
		},
		['database', 'paging', 'output'],
	),
	output: simplifiedPage,
	deriveOutput: deriveGetAllOutput,
	resourceSchema: { methodName: 'getFilterProperties', toOutput: typeFromDataSource },
	example: {
		database: { mode: 'pick', name: 'Tasks' },
		filter: {
			mode: 'conditions',
			match: 'all',
			conditions: [
				{ property: 'Name', type: 'title', condition: { op: 'equals', value: 'Launch v2' } },
			],
		},
		paging: { mode: 'limit', max: 1 },
		output: { mode: 'simplified' },
	},
	compile: {
		type: 'n8n-nodes-base.notion',
		typeVersion: 3,
		discriminators: { resource: 'databasePage', operation: 'getAll' },
		parameters: (input) => {
			const database = record(input.database);
			const paging = record(input.paging);
			return {
				resource: 'databasePage',
				operation: 'getAll',
				dataSourceId:
					tagOf(database, 'mode') === 'id'
						? resourceLocator('id', database.id)
						: resourceLocator('list', '', database.name),
				returnAll: tagOf(paging, 'mode') === 'all',
				...(tagOf(paging, 'mode') === 'limit' ? { limit: paging.max } : {}),
				...compileFilter(input.filter),
				simple: simpleFlag(input),
				options: {
					...compileSort(input.sort),
					...(input.downloadFiles === true ? { downloadFiles: true } : {}),
				},
			};
		},
	},
};

export const notionGetPage: ActionContract = {
	id: 'notion.databasePage.get',
	node: 'notion',
	action: 'Get a database page',
	summary: 'Get one database page by URL or ID.',
	flow: { effect: 'read', cardinality: 'per-item', passthrough: 'replace', idempotent: true },
	credentials: CREDENTIALS,
	input: obj(
		{
			page: variant('mode', {
				url: { properties: { url: NOTION_PAGE_URL }, required: ['url'] },
				id: { properties: { id: NOTION_ID }, required: ['id'] },
			}),
			output: outputMode,
		},
		['page', 'output'],
	),
	output: simplifiedPage,
	example: { page: { mode: 'id', id: '={{ $json.id }}' }, output: { mode: 'simplified' } },
	compile: {
		type: 'n8n-nodes-base.notion',
		typeVersion: 3,
		discriminators: { resource: 'databasePage', operation: 'get' },
		parameters: (input) => {
			const page = record(input.page);
			const mode = tagOf(page, 'mode') === 'url' ? 'url' : 'id';
			return {
				resource: 'databasePage',
				operation: 'get',
				pageId: resourceLocator(mode, mode === 'url' ? page.url : page.id),
				simple: simpleFlag(input),
				options: {},
			};
		},
	},
};
