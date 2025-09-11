import {
	NodeOperationError,
	type IDisplayOptions,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { DRY_RUN } from '../../common/fields';
import { getSelectFields, getSelectFilter } from '../../common/selectMany';
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

	const filter = getSelectFilter(this, index);

	if (dryRun) {
		const { data: rowsToDelete } = await dataStoreProxy.getManyRowsAndCount({ filter });
		return rowsToDelete.map((json) => ({ json }));
	}

	const result = await dataStoreProxy.deleteRows({ filter });

	return result.map((json) => ({ json }));
}
