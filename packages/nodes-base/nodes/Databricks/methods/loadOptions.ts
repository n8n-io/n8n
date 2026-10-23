import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { resolveSelectedLakebaseSchema } from '../actions/lakebase/helpers';
import { fetchLakebaseColumns } from '../actions/lakebase/schema';
import { explainLakebaseSchemaError } from '../transport';

async function listColumns(context: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const target = await resolveSelectedLakebaseSchema(context);
		if (!target) return [];

		const columns = await fetchLakebaseColumns(context, target.schemaUrl, target.name);
		return columns.map((column) => ({ name: column.name, value: column.name }));
	} catch (error) {
		explainLakebaseSchemaError(
			error,
			'Turn on the "OpenAPI specification" setting of the Data API to list columns, or enter the column name with an expression',
		);
	}
}

export async function getLakebaseColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await listColumns(this);
}

export async function getLakebaseColumnsMultiOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const columns = await listColumns(this);
	if (columns.length === 0) return [];

	return [{ name: '*', value: '*', description: 'All columns' }, ...columns];
}
