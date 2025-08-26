import {
	NodeOperationError,
	type IDisplayOptions,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { ADD_ROW, getAddRow } from '../../common/addRow';
import { DRY_RUN } from '../../common/fields';
import { executeSelectMany, getSelectFields } from '../../common/selectMany';
import { getDataTableProxyExecute } from '../../common/utils';

export const FIELD: string = 'update';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['row'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	...getSelectFields(displayOptions),
	{
		...ADD_ROW,
		displayOptions,
	},
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
	const matches = await executeSelectMany(this, index, dataStoreProxy);

	if (dryRun) {
		return matches;
	}

	const result = [];
	for (const x of matches) {
		const updatedRows = await dataStoreProxy.updateRows({
			data: row,
			filter: { id: x.json.id },
		});
		if (updatedRows.length !== 0) {
			throw new NodeOperationError(this.getNode(), 'invariant broken');
		}
		result.push(updatedRows[0]);
	}

	return matches;
}
