import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { fetchLakebaseColumns } from '../actions/lakebase/schema';
import { resolveLakebaseRestBase } from '../transport';

const LOCATORS = [
	'lakebaseProject',
	'lakebaseBranch',
	'lakebaseDatabase',
	'lakebaseSchema',
	'lakebaseTable',
] as const;

/**
 * Reads the five locators. Load options run before the node has an item, so this
 * cannot use the resolvers in `actions/lakebase/helpers.ts`, which take an item index.
 */
function readLocators(context: ILoadOptionsFunctions): string[] | undefined {
	const values = LOCATORS.map((name) => {
		const value = context.getNodeParameter(name, undefined, { extractValue: true });
		return typeof value === 'string' ? value : '';
	});

	return values.every(Boolean) ? values : undefined;
}

async function listColumns(context: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const locators = readLocators(context);
	// An unset locator means the user has not finished choosing a table yet
	if (!locators) return [];

	const [project, branch, database, schema, table] = locators;
	const base = await resolveLakebaseRestBase(context, project, branch);
	const columns = await fetchLakebaseColumns(
		context,
		`${base}/${encodeURIComponent(database)}/${encodeURIComponent(schema)}`,
		table,
	);

	return columns.map((column) => ({ name: column.name, value: column.name }));
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
