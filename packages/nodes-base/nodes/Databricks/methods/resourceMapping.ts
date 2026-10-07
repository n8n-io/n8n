import type { FieldType, ILoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow';

import {
	readLakebaseTarget,
	readLoadLocator,
	resolveLakebaseSchemaUrlFor,
} from '../actions/lakebase/helpers';
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

const DATE_FORMATS = new Set([
	'date',
	'date-time',
	'timestamp with time zone',
	'timestamp without time zone',
]);

function fieldTypeOf(column: LakebaseColumn): FieldType {
	if (column.enum) return 'options';
	if (column.format && DATE_FORMATS.has(column.format)) return 'dateTime';
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

/**
 * Lists a table's columns for the Columns form.
 *
 * Load options run before the node has an item, so this reads the locators with
 * the load-time helpers in `actions/lakebase/helpers.ts`.
 */
export async function getLakebaseMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const target = readLakebaseTarget(this);
	const table = readLoadLocator(this, 'lakebaseTable');
	if (!Object.values(target).every(Boolean) || !table) return { fields: [] };

	const schemaUrl = await resolveLakebaseSchemaUrlFor(this, target);

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
			defaultMatch: false,
			canBeUsedToMatch: false,
			readOnly: column.isReadOnly,
			type: fieldTypeOf(column),
			options: column.enum?.map((value) => ({ name: String(value), value: value as string })),
		})),
	};
}

/** Lists a function's arguments for the Arguments form */
export async function getLakebaseFunctionArguments(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const target = readLakebaseTarget(this);
	const fn = readLoadLocator(this, 'lakebaseFunction');
	if (!Object.values(target).every(Boolean) || !fn) return { fields: [] };

	const schemaUrl = await resolveLakebaseSchemaUrlFor(this, target);

	let args: LakebaseColumn[];
	try {
		args = await fetchLakebaseFunctionArguments(this, schemaUrl, fn);
	} catch (error) {
		if (!isOpenApiUnavailable(error, `${schemaUrl}/openapi.json`)) throw error;
		args = [];
	}
	if (args.length === 0) {
		return { fields: [], emptyFieldsNotice: FUNCTION_ARGUMENTS_UNAVAILABLE_NOTICE };
	}

	return {
		fields: args.map((arg) => ({
			id: arg.name,
			displayName: arg.name,
			required: arg.isRequired,
			display: true,
			defaultMatch: false,
			canBeUsedToMatch: false,
			type: fieldTypeOf(arg),
		})),
	};
}
