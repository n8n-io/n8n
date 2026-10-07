import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { lakebaseApiRequest } from '../../transport';
import { buildLakebaseFilter, type LakebaseWhereRule } from './conditions';
import { resolveLakebaseTableUrl } from './helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const url = await resolveLakebaseTableUrl(this, i);

	const where = this.getNodeParameter('where.values', i, []) as LakebaseWhereRule[];
	const combineConditions = this.getNodeParameter('combineConditions', i, 'AND') as 'AND' | 'OR';
	const qs = buildLakebaseFilter({ where, combineConditions });

	// The Data API applies no filter of its own, so an unfiltered delete empties
	// the table and there is nothing to undo it. A condition row left blank
	// builds nothing, which is why this tests the filter rather than the rows.
	if (Object.keys(qs).length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one condition is required', {
			itemIndex: i,
			description: 'Add a condition under Select Rows so the node knows which rows to delete.',
		});
	}

	const response = await lakebaseApiRequest(this, {
		method: 'DELETE',
		url,
		qs,
		json: true,
		headers: { Accept: 'application/json', Prefer: 'return=representation' },
	});

	const deleted = Array.isArray(response) ? (response as IDataObject[]) : [];
	return deleted.map((row) => ({ json: row, pairedItem: { item: i } }));
}
