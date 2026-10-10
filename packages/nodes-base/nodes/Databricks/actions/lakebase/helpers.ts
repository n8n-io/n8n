import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions } from 'n8n-workflow';

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

/** `https://{host}/api/2.0/workspace/{id}/rest/{database}/{schema}`, the prefix every Data API path shares */
export async function resolveLakebaseSchemaUrl(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<string> {
	const project = readLocator(context, itemIndex, 'lakebaseProject', 'project');
	const branch = readLocator(context, itemIndex, 'lakebaseBranch', 'branch');
	const database = readLocator(context, itemIndex, 'lakebaseDatabase', 'database');
	const schema = readLocator(context, itemIndex, 'lakebaseSchema', 'schema');
	const base = await resolveLakebaseRestBase(context, project, branch);
	return `${base}/${encodeURIComponent(database)}/${encodeURIComponent(schema)}`;
}

export async function resolveLakebaseTableUrl(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<string> {
	const table = readLocator(context, itemIndex, 'lakebaseTable', 'table');
	return `${await resolveLakebaseSchemaUrl(context, itemIndex)}/${encodeURIComponent(table)}`;
}
