import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import type { DatabricksContext } from '../helpers';
import { resolveLakebaseRestBase } from '../../transport';

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

export function readLakebaseTarget(context: ILoadOptionsFunctions): {
	project: string;
	branch: string;
	database: string;
	schema: string;
} {
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
	target: ReturnType<typeof readLakebaseTarget>,
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
	const fn = readLocator(context, itemIndex, 'lakebaseFunction', 'function');
	return `${await resolveLakebaseSchemaUrl(context, itemIndex)}/rpc/${encodeURIComponent(fn)}`;
}
