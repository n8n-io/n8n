import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { getSelectedLakebaseTarget } from '../actions/lakebase/helpers';
import { fetchLakebaseColumns } from '../actions/lakebase/schema';
import { explainLakebaseSchemaError, resolveLakebaseRestBase } from '../transport';

async function listColumns(context: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { project, branch, database, schema, table } = getSelectedLakebaseTarget(context);
	// An unset locator means the user has not finished choosing a table yet
	if (!project || !branch || !database || !schema || !table) return [];

	try {
		const base = await resolveLakebaseRestBase(context, project, branch);
		const columns = await fetchLakebaseColumns(
			context,
			`${base}/${encodeURIComponent(database)}/${encodeURIComponent(schema)}`,
			table,
		);

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
