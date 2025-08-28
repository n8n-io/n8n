import {
	NodeOperationError,
	type IDisplayOptions,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { makeAddRow, getAddRow } from '../../common/addRow';
import { DRY_RUN } from '../../common/fields';
import { executeSelectMany, getSelectFields } from '../../common/selectMany';
import { getDataTableProxyExecute } from '../../common/utils';

export const FIELD: string = 'upsert';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['row'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	...getSelectFields(displayOptions),
	makeAddRow(FIELD, displayOptions),

	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add option',
		options: [DRY_RUN],
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const dataStoreProxy = await getDataTableProxyExecute(this, index);

	const dryRun = this.getNodeParameter(`options.${DRY_RUN.name}`, index, false);

	if (typeof dryRun !== 'boolean') {
		throw new NodeOperationError(
			this.getNode(),
			`unexpected input ${JSON.stringify(dryRun)} for boolean dryRun`,
		);
	}

	const row = getAddRow(this, index);

	const matches = await executeSelectMany(this, index, dataStoreProxy, true);

	if (dryRun) {
		return matches;
	}

	// insert
	if (matches.length === 0) {
		const result = await dataStoreProxy.insertRows([row]);
		return result.map((json) => ({ json }));
	}

	// update
	const result = [];
	for (const match of matches) {
		const updatedRows = await dataStoreProxy.updateRows({
			data: row,
			filter: { id: match.json.id },
		});
		if (updatedRows.length !== 1) {
			throw new NodeOperationError(this.getNode(), 'invariant broken');
		}

		// The input object gets updated in the api call, somehow
		// And providing this column to the backend causes an unexpected column error
		// So let's just re-delete the field until we have a more aligned API
		delete row['updatedAt'];

		result.push(updatedRows[0]);
	}

	return result.map((json) => ({ json }));
}
