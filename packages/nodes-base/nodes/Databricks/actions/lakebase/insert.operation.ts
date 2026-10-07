import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { lakebaseApiRequest } from '../../transport';
import { resolveLakebaseTableUrl } from './helpers';

/**
 * The Data API rejects the whole row for a field the table does not have, so an
 * item carrying anything extra from an earlier node would never insert.
 */
function columnsPresentInTable(context: IExecuteFunctions, i: number): IDataObject {
	const item = context.getInputData()[i].json;
	const schema = context.getNodeParameter('columns.schema', i, []) as Array<{ id?: string }>;
	const known = new Set(schema.map((field) => field.id));
	if (known.size === 0) return item;

	return Object.fromEntries(Object.entries(item).filter(([column]) => known.has(column)));
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const url = await resolveLakebaseTableUrl(this, i);

	const mappingMode = this.getNodeParameter('columns.mappingMode', i) as string;
	const row =
		mappingMode === 'autoMapInputData'
			? columnsPresentInTable(this, i)
			: // Core validates and coerces the mapped values only for a path ending in `value`.
				// An all-defaults row leaves that value null rather than absent.
				((this.getNodeParameter('columns.value', i, {}) as IDataObject | null) ?? {});

	const response = await lakebaseApiRequest(this, {
		method: 'POST',
		url,
		body: row,
		json: true,
		headers: { Accept: 'application/json', Prefer: 'return=representation' },
	});

	// `return=representation` echoes the created rows, including values the
	// database filled in. A project that does not honour it answers empty.
	const created = Array.isArray(response) ? (response as IDataObject[]) : [];
	if (created.length === 0) return [{ json: { success: true }, pairedItem: { item: i } }];

	return created.map((created_row) => ({ json: created_row, pairedItem: { item: i } }));
}
