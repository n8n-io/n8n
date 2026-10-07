import type { FieldType, ILoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow';

import { isOpenApiUnavailable, OPENAPI_DISABLED_NOTICE } from '../actions/lakebase/openApiDocument';
import { fetchLakebaseColumns, type LakebaseColumn } from '../actions/lakebase/schema';
import { resolveLakebaseRestBase } from '../transport';

const DATE_FORMATS = new Set([
	'date',
	'date-time',
	'timestamp with time zone',
	'timestamp without time zone',
]);

function fieldTypeOf(column: LakebaseColumn): FieldType {
	if (column.enum) return 'options';
	if (column.format && DATE_FORMATS.has(column.format)) return 'dateTime';

	switch (column.type) {
		case 'integer':
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'array':
			return 'array';
		case 'object':
			return 'object';
		default:
			return 'string';
	}
}

/**
 * Lists a table's columns for the Columns form.
 *
 * Load options run before the node has an item, so this resolves the URL itself
 * rather than using the helpers in `actions/lakebase/helpers.ts`, which take an
 * item index.
 */
export async function getLakebaseMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const read = (name: string) => {
		const value = this.getNodeParameter(name, undefined, { extractValue: true });
		return typeof value === 'string' ? value : '';
	};

	const project = read('lakebaseProject');
	const branch = read('lakebaseBranch');
	const database = read('lakebaseDatabase');
	const schema = read('lakebaseSchema');
	const table = read('lakebaseTable');
	if (!project || !branch || !database || !schema || !table) return { fields: [] };

	const base = await resolveLakebaseRestBase(this, project, branch);
	const schemaUrl = `${base}/${encodeURIComponent(database)}/${encodeURIComponent(schema)}`;

	let columns: LakebaseColumn[];
	try {
		columns = await fetchLakebaseColumns(this, schemaUrl, table);
	} catch (error) {
		if (!isOpenApiUnavailable(error, `${schemaUrl}/openapi.json`)) throw error;
		return { fields: [], emptyFieldsNotice: OPENAPI_DISABLED_NOTICE };
	}

	return {
		fields: columns.map((column) => ({
			id: column.name,
			displayName: column.name,
			// The document marks every NOT NULL column required, including ones the
			// database fills in, so asking for those would demand a value twice.
			required: column.isRequired && !column.hasDefault && !column.isReadOnly,
			display: true,
			defaultMatch: column.isPrimaryKey,
			canBeUsedToMatch: true,
			readOnly: column.isReadOnly,
			type: fieldTypeOf(column),
			options: column.enum?.map((value) => ({ name: String(value), value: value as string })),
		})),
	};
}
