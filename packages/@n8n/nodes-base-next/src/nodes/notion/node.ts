import {
	defineNode,
	defineResource,
	isHttpError,
	isRecord,
	list,
	type Http,
	type JsonSchema,
} from '@n8n/node-sdk';

export const notion = defineNode({
	id: 'notion',
	displayName: 'Notion',
	credentials: ['notionApi', 'notionOAuth2Api'],
	baseUrl: 'https://api.notion.com/v1',
});

export const NOTION_VERSION = { 'Notion-Version': '2026-03-11' };

const ID = '[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}';

export const notionDatabase = defineResource({
	id: 'notion.database',
	label: 'Database',
	shape: { pattern: ID, 'x-n8n-hint': 'Notion database ID or URL; 32 hex digits' },
});

export const notionIdOf = (value: string) => new RegExp(ID).exec(value)?.[0] ?? value;

/** change-case v5 `snakeCase`, which the v3 node uses for simplified keys. */
export const snakeCase = (name: string) =>
	name
		.replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
		.replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2')
		.split(/[^\p{L}\d]+/u)
		.filter(Boolean)
		.map((word) => word.toLowerCase())
		.join('_');

const nameOf = (value: unknown) => (isRecord(value) ? (value.name ?? null) : null);

/**
 * Like v3, a count or percent rollup is a number (a percent times 100) and a show rollup is the
 * simplified elements. Other rollups give their value, where v3 gives nothing.
 */
function simplifyRollup(rollup: unknown): unknown {
	if (!isRecord(rollup) || typeof rollup.type !== 'string') return undefined;
	const name = typeof rollup.function === 'string' ? rollup.function : '';
	if (rollup.type === 'array') {
		const elements = list(rollup.array).flatMap((element) => [simplifyProperty(element)].flat());
		return name === 'show_unique' ? [...new Set(elements)] : elements;
	}
	const value = rollup[rollup.type];
	return typeof value === 'number' && name.includes('percent') ? value * 100 : value;
}

/** Mirrors `simplifyProperty` in nodes-base Notion/shared/GenericFunctions.ts. */
function simplifyProperty(property: unknown): unknown {
	if (!isRecord(property) || typeof property.type !== 'string') return undefined;
	const { type } = property;
	const value = property[type];
	switch (type) {
		case 'text':
			return property.plain_text;
		case 'title':
		case 'rich_text':
			return list(value)
				.map((text) => (isRecord(text) ? text.plain_text : ''))
				.join('');
		case 'url':
		case 'created_time':
		case 'checkbox':
		case 'number':
		case 'last_edited_time':
		case 'email':
		case 'phone_number':
		case 'date':
			return value;
		case 'created_by':
		case 'last_edited_by':
		case 'select':
			return nameOf(value);
		case 'status':
			return isRecord(value) ? value.name : undefined;
		case 'people':
			// v3 gives `{}` for a bot or a user without an email; the output promises emails.
			return list(value).flatMap((person) =>
				isRecord(person) && isRecord(person.person) && typeof person.person.email === 'string'
					? [person.person.email]
					: [],
			);
		case 'multi_select':
			return list(value).map((option) => (isRecord(option) ? (option.name ?? {}) : {}));
		case 'relation':
			return list(value).map((relation) => (isRecord(relation) ? (relation.id ?? {}) : {}));
		case 'formula':
			return isRecord(value) && typeof value.type === 'string' ? value[value.type] : undefined;
		case 'rollup':
			return simplifyRollup(value);
		case 'unique_id':
			// v3 drops unique IDs. Notion shows them as prefix-number, e.g. TASK-42.
			if (!isRecord(value) || typeof value.number !== 'number') return undefined;
			return typeof value.prefix === 'string'
				? `${value.prefix}-${value.number}`
				: String(value.number);
		case 'files':
			return list(value).map((file) => {
				const hosted =
					isRecord(file) && typeof file.type === 'string' ? file[file.type] : undefined;
				return isRecord(hosted) ? hosted.url : undefined;
			});
		default:
			return undefined;
	}
}

/** A database page as the v3 node emits it with `simple: true`. */
export function simplifyPage(page: unknown): Record<string, unknown> {
	if (!isRecord(page)) return {};
	const properties = isRecord(page.properties) ? page.properties : {};
	const title = Object.values(properties).find(
		(property) => isRecord(property) && property.type === 'title',
	);
	return {
		id: page.id,
		name: simplifyProperty(title) ?? '',
		url: page.url,
		...Object.fromEntries(
			Object.entries(properties).map(([name, property]) => [
				`property_${snakeCase(name)}`,
				simplifyProperty(property),
			]),
		),
	};
}

const str: JsonSchema = { type: 'string' };
const date: JsonSchema = { type: 'string', format: 'date' };
const nullable = (schema: JsonSchema): JsonSchema => ({ anyOf: [schema, { type: 'null' }] });
const strings: JsonSchema = { type: 'array', items: str };

/** Simplified value types by Notion property type. */
export const SIMPLIFIED: Record<string, JsonSchema> = {
	title: str,
	rich_text: str,
	email: nullable({ type: 'string', format: 'email' }),
	url: nullable({ type: 'string', format: 'uri' }),
	phone_number: nullable(str),
	select: { ...nullable(str), 'x-n8n-hint': 'option name' },
	status: { ...str, 'x-n8n-hint': 'option name' },
	created_by: nullable(str),
	last_edited_by: nullable(str),
	['number']: nullable({ type: 'number' }),
	checkbox: { type: 'boolean' },
	created_time: { type: 'string', format: 'date-time' },
	last_edited_time: { type: 'string', format: 'date-time' },
	date: nullable({
		type: 'object',
		properties: { start: date, end: nullable(date), time_zone: nullable(str) },
		required: ['start', 'end', 'time_zone'],
		additionalProperties: false,
	}),
	people: {
		type: 'array',
		items: { type: 'string', format: 'email' },
		'x-n8n-hint': 'emails; a person without an email is left out',
	},
	unique_id: {
		...str,
		'x-n8n-hint': 'prefix-number, e.g. TASK-42; the number alone without a prefix',
	},
	multi_select: { ...strings, 'x-n8n-hint': 'option names' },
	relation: { ...strings, 'x-n8n-hint': 'page IDs' },
	files: { ...strings, 'x-n8n-hint': 'file URLs' },
};

/** A database ID resolves to its first data source; a data source ID is used as is. */
export async function dataSourceOf(http: Http, id: string): Promise<string> {
	try {
		const database = await http.request({ path: `/databases/${id}`, headers: NOTION_VERSION });
		const [first] = isRecord(database) ? list(database.data_sources) : [];
		return isRecord(first) && typeof first.id === 'string' ? first.id : id;
	} catch (error) {
		// Notion answers 400 or 404 for a data source ID. Other errors are real failures.
		if (isHttpError(error) && (error.status === 400 || error.status === 404)) return id;
		throw error;
	}
}
