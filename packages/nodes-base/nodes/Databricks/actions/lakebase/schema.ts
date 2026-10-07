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
	const document = await lakebaseApiRequest(context, {
		method: 'GET',
		url: `${schemaUrl}/openapi.json`,
		headers: { Accept: 'application/openapi+json, application/json' },
		json: true,
	});

	if (!isRecord(document)) return [];
	const components = isRecord(document.components) ? document.components : undefined;
	const schemas = components && isRecord(components.schemas) ? components.schemas : undefined;
	const definition = schemas && isRecord(schemas[table]) ? schemas[table] : undefined;
	if (!definition || !isRecord(definition.properties)) return [];

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
