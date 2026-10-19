import type { FieldType, ILoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow';

import { resolveSelectedLakebaseSchema } from '../actions/lakebase/helpers';
import {
	FUNCTION_ARGUMENTS_UNAVAILABLE_NOTICE,
	isOpenApiUnavailable,
	OPENAPI_DISABLED_NOTICE,
} from '../actions/lakebase/openApiDocument';
import {
	fetchLakebaseColumns,
	fetchLakebaseFunctionArguments,
	type LakebaseColumn,
} from '../actions/lakebase/schema';

const TIME_FORMATS = new Set(['time', 'time without time zone', 'time with time zone']);

const DATE_FORMATS = new Set([
	'date',
	'date-time',
	'timestamp with time zone',
	'timestamp without time zone',
]);

function fieldTypeOf(column: LakebaseColumn): FieldType {
	if (column.enum) return 'options';
	if (column.format && DATE_FORMATS.has(column.format)) return 'dateTime';
	if (column.format && TIME_FORMATS.has(column.format)) return 'time';
	// PostgREST emits json/jsonb with a format but no type
	if (column.format === 'json' || column.format === 'jsonb') return 'object';

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

/** The form shows no type or required marker of its own, so the label carries both: `quantity (integer) *` */
function labelOf(column: LakebaseColumn, required: boolean): string {
	const type = column.format ?? column.type;
	return `${column.name}${type ? ` (${type})` : ''}${required ? ' *' : ''}`;
}

/** Lists a table's columns for the Columns form. */
export async function getLakebaseMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const target = await resolveSelectedLakebaseSchema(this);
	if (!target) return { fields: [] };

	let columns: LakebaseColumn[];
	try {
		columns = await fetchLakebaseColumns(this, target.schemaUrl, target.name);
	} catch (error) {
		if (!isOpenApiUnavailable(error, `${target.schemaUrl}/openapi.json`)) throw error;
		return { fields: [], emptyFieldsNotice: OPENAPI_DISABLED_NOTICE };
	}

	return {
		// The document marks every NOT NULL column required, including ones the
		// database fills in, so asking for those would demand a value twice.
		fields: columns.map((column) => {
			const required = column.isRequired && !column.hasDefault && !column.isReadOnly;
			return {
				id: column.name,
				displayName: labelOf(column, required),
				required,
				display: true,
				defaultMatch: column.isPrimaryKey,
				canBeUsedToMatch: true,
				readOnly: column.isReadOnly,
				type: fieldTypeOf(column),
				options: column.enum?.map((value) => ({ name: String(value), value: value as string })),
			};
		}),
	};
}

/** Lists a function's arguments for the Arguments form */
export async function getLakebaseFunctionArguments(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const target = await resolveSelectedLakebaseSchema(this, 'function');
	if (!target) return { fields: [] };

	let args: LakebaseColumn[];
	try {
		args = await fetchLakebaseFunctionArguments(this, target.schemaUrl, target.name);
	} catch (error) {
		if (!isOpenApiUnavailable(error, `${target.schemaUrl}/openapi.json`)) throw error;
		args = [];
	}
	if (args.length === 0) {
		return { fields: [], emptyFieldsNotice: FUNCTION_ARGUMENTS_UNAVAILABLE_NOTICE };
	}

	return {
		fields: args.map((arg) => ({
			id: arg.name,
			displayName: labelOf(arg, arg.isRequired),
			required: arg.isRequired,
			display: true,
			defaultMatch: false,
			canBeUsedToMatch: false,
			type: fieldTypeOf(arg),
			options: arg.enum?.map((value) => ({ name: String(value), value: value as string })),
		})),
	};
}
