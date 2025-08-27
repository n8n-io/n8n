import {
	NodeOperationError,
	type IDisplayOptions,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { DRY_RUN } from '../../common/fields';
import { executeSelectMany, getSelectFields } from '../../common/selectMany';
import { getDataTableProxyExecute } from '../../common/utils';

// named `deleteRows` since `delete` is a reserved keyword
export const FIELD: string = 'deleteRows';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['row'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	...getSelectFields(displayOptions),
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

	const matches = await executeSelectMany(this, index, dataStoreProxy);

	if (!dryRun) {
		const success = await dataStoreProxy.deleteRows(matches.map((x) => x.json.id));
		if (!success) {
			throw new NodeOperationError(this.getNode(), `failed to delete rows for index ${index}`);
		}
	}

	return matches;
}
