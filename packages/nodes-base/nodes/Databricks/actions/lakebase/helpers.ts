import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { extractResourceLocatorValue } from '../helpers';
import type { DatabricksContext } from '../helpers';
import { resolveLakebaseRestBase } from '../../transport';

/**
 * The execute-time resolvers below take an item index, which a dropdown request does
 * not have, so load options read the locators the editor currently holds instead.
 */
export function getSelectedLakebaseTarget(context: ILoadOptionsFunctions) {
	const read = (name: string) =>
		extractResourceLocatorValue(context.getCurrentNodeParameter(name)) || undefined;
	return {
		project: read('lakebaseProject'),
		branch: read('lakebaseBranch'),
		database: read('lakebaseDatabase'),
		schema: read('lakebaseSchema'),
		table: read('lakebaseTable'),
	};
}

/**
 * Resolves the REST URL of the schema the editor currently has selected, or null
 * when the user has not finished choosing a table. Shared by the column dropdown
 * and the column mapper, which differ only in how they render and how they report
 * a missing schema document.
 */
export async function resolveSelectedLakebaseSchema(
	context: ILoadOptionsFunctions,
): Promise<{ schemaUrl: string; table: string } | null> {
	const { project, branch, database, schema, table } = getSelectedLakebaseTarget(context);
	// An unset locator means the user has not finished choosing a table yet
	if (!project || !branch || !database || !schema || !table) return null;

	const base = await resolveLakebaseRestBase(context, project, branch);
	return {
		schemaUrl: `${base}/${encodeURIComponent(database)}/${encodeURIComponent(schema)}`,
		table,
	};
}

function readLocator(
	context: IExecuteFunctions,
	itemIndex: number,
	name: string,
	label: string,
): string {
	const value = context.getNodeParameter(name, itemIndex, '', { extractValue: true });
	if (typeof value !== 'string' || !value) {
		throw new NodeOperationError(context.getNode(), `Select a Lakebase ${label}`, { itemIndex });
	}
	return value;
}

/** Load-time locator read: no item index yet, so '' (not an error) when unset */
export function readLoadLocator(context: ILoadOptionsFunctions, name: string): string {
	const value = context.getNodeParameter(name, undefined, { extractValue: true });
	return typeof value === 'string' ? value : '';
}

export type LakebaseTarget = { project: string; branch: string; database: string; schema: string };

export function readLakebaseTarget(context: ILoadOptionsFunctions): LakebaseTarget {
	return {
		project: readLoadLocator(context, 'lakebaseProject'),
		branch: readLoadLocator(context, 'lakebaseBranch'),
		database: readLoadLocator(context, 'lakebaseDatabase'),
		schema: readLoadLocator(context, 'lakebaseSchema'),
	};
}

/** `https://{host}/api/2.0/workspace/{id}/rest/{database}/{schema}` from already-read locators */
export async function resolveLakebaseSchemaUrlFor(
	context: DatabricksContext,
	target: LakebaseTarget,
): Promise<string> {
	const base = await resolveLakebaseRestBase(context, target.project, target.branch);
	return `${base}/${encodeURIComponent(target.database)}/${encodeURIComponent(target.schema)}`;
}

/** `https://{host}/api/2.0/workspace/{id}/rest/{database}/{schema}`, the prefix every Data API path shares */
export async function resolveLakebaseSchemaUrl(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<string> {
	const project = readLocator(context, itemIndex, 'lakebaseProject', 'project');
	const branch = readLocator(context, itemIndex, 'lakebaseBranch', 'branch');
	const database = readLocator(context, itemIndex, 'lakebaseDatabase', 'database');
	const schema = readLocator(context, itemIndex, 'lakebaseSchema', 'schema');
	return await resolveLakebaseSchemaUrlFor(context, { project, branch, database, schema });
}

export async function resolveLakebaseTableUrl(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<string> {
	const table = readLocator(context, itemIndex, 'lakebaseTable', 'table');
	return `${await resolveLakebaseSchemaUrl(context, itemIndex)}/${encodeURIComponent(table)}`;
}

export async function resolveLakebaseFunctionUrl(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<string> {
	const functionName = readLocator(context, itemIndex, 'lakebaseFunction', 'function');
	return `${await resolveLakebaseSchemaUrl(context, itemIndex)}/rpc/${encodeURIComponent(functionName)}`;
}
