import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { lakebaseApiRequest } from '../../transport';
import { buildLakebaseFilter, type LakebaseWhereRule } from './conditions';
import { resolveLakebaseTableUrl } from './helpers';
import { columnsPresentInTable, columnsTheUserSet } from './mapping';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const url = await resolveLakebaseTableUrl(this, i);

	// The property default carries no matchingColumns key, so a node built from
	// JSON would throw on a read without a fallback
	const matchingColumns = this.getNodeParameter('columns.matchingColumns', i, []) as string[];
	const mappingMode = this.getNodeParameter('columns.mappingMode', i) as string;
	const row =
		mappingMode === 'autoMapInputData'
			? columnsPresentInTable(this, i)
			: columnsTheUserSet(
					(this.getNodeParameter('columns.value', i, {}) as IDataObject | null) ?? {},
				);

	if (matchingColumns.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Select a column to match on', {
			itemIndex: i,
			description: 'The node needs a column to decide which rows to update.',
		});
	}

	const missing = matchingColumns.filter((column) => row[column] === undefined);
	if (missing.length > 0) {
		throw new NodeOperationError(
			this.getNode(),
			`The column to match on has no value: ${missing.join(', ')}`,
			{
				itemIndex: i,
				description: 'Give every matching column a value, so the node can find the rows to update.',
			},
		);
	}

	const where: LakebaseWhereRule[] = matchingColumns.map((column) => ({
		column,
		condition: 'eq',
		value: row[column],
	}));
	const qs = buildLakebaseFilter({ where, combineConditions: 'AND' });

	const body = Object.fromEntries(
		Object.entries(row).filter(([column]) => !matchingColumns.includes(column)),
	);

	const response = await lakebaseApiRequest(this, {
		method: 'PATCH',
		url,
		qs,
		body,
		json: true,
		headers: { Accept: 'application/json', Prefer: 'return=representation' },
	});

	const updated = Array.isArray(response) ? (response as IDataObject[]) : [];
	return updated.map((updatedRow) => ({ json: updatedRow, pairedItem: { item: i } }));
}
