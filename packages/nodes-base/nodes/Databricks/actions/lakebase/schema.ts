import { isRecord } from '@n8n/utils/is-record';

import type { DatabricksContext } from '../helpers';
import { lakebaseApiRequest } from '../../transport';

export type LakebaseColumn = {
	name: string;
	type?: string;
	format?: string;
	enum?: unknown[];
	hasDefault: boolean;
	isRequired: boolean;
	isReadOnly: boolean;
	isPrimaryKey: boolean;
};

/** PostgREST flags the primary key in the column description */
const PRIMARY_KEY_MARKER = /<pk\/>/;

async function fetchOpenApiDocument(
	context: DatabricksContext,
	schemaUrl: string,
): Promise<unknown> {
	return await lakebaseApiRequest(context, {
		method: 'GET',
		url: `${schemaUrl}/openapi.json`,
		headers: { Accept: 'application/openapi+json, application/json' },
		json: true,
	});
}

function columnsOf(definition: Record<string, unknown>): LakebaseColumn[] {
	if (!isRecord(definition.properties)) return [];

	const required = Array.isArray(definition.required) ? definition.required.map(String) : [];

	return Object.entries(definition.properties).map(([name, raw]) => {
		const property = isRecord(raw) ? raw : {};
		const description = typeof property.description === 'string' ? property.description : '';

		return {
			name,
			type: typeof property.type === 'string' ? property.type : undefined,
			format: typeof property.format === 'string' ? property.format : undefined,
			enum: Array.isArray(property.enum) ? property.enum : undefined,
			hasDefault: 'default' in property,
			isRequired: required.includes(name),
			isReadOnly: property.readOnly === true,
			isPrimaryKey: PRIMARY_KEY_MARKER.test(description),
		};
	});
}

/**
 * Reads a table's columns from the schema's OpenAPI document.
 *
 * Reports what the document says and applies no policy of its own. A caller that
 * needs to know whether to demand a value decides that for itself, because
 * `required` lists every NOT NULL column, including ones the database defaults.
 */
export async function fetchLakebaseColumns(
	context: DatabricksContext,
	schemaUrl: string,
	table: string,
): Promise<LakebaseColumn[]> {
	const document = await fetchOpenApiDocument(context, schemaUrl);

	if (!isRecord(document)) return [];
	const components = isRecord(document.components) ? document.components : undefined;
	const schemas = components && isRecord(components.schemas) ? components.schemas : undefined;
	const definition = schemas && isRecord(schemas[table]) ? schemas[table] : undefined;
	return definition ? columnsOf(definition) : [];
}

/** Every function the document lists, internal helpers included; the picker filters */
export async function fetchLakebaseFunctions(
	context: DatabricksContext,
	schemaUrl: string,
): Promise<string[]> {
	const document = await fetchOpenApiDocument(context, schemaUrl);

	if (!isRecord(document) || !isRecord(document.paths)) return [];
	// PostgREST exposes every function of the schema under this path prefix
	return Object.keys(document.paths)
		.filter((path) => path.startsWith('/rpc/'))
		.map((path) => path.slice('/rpc/'.length));
}

/** A function's named arguments, read from the POST request body schema */
export async function fetchLakebaseFunctionArguments(
	context: DatabricksContext,
	schemaUrl: string,
	functionName: string,
): Promise<LakebaseColumn[]> {
	const document = await fetchOpenApiDocument(context, schemaUrl);

	if (!isRecord(document) || !isRecord(document.paths)) return [];
	const path = document.paths[`/rpc/${functionName}`];
	const post = isRecord(path) && isRecord(path.post) ? path.post : undefined;
	const requestBody = post && isRecord(post.requestBody) ? post.requestBody : undefined;
	const content = requestBody && isRecord(requestBody.content) ? requestBody.content : undefined;
	// The media type key carries a charset, so take the first entry instead of matching it
	const entry = content ? Object.values(content).find(isRecord) : undefined;
	return entry && isRecord(entry.schema) ? columnsOf(entry.schema) : [];
}
