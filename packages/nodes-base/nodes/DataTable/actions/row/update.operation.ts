import {
	NodeOperationError,
	type IDisplayOptions,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { makeAddRow, getAddRow } from '../../common/addRow';
import { getSelectFields, getSelectFilter } from '../../common/selectMany';
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
	makeAddRow(FIELD, displayOptions),
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const dataStoreProxy = await getDataTableProxyExecute(this, index);

	const row = getAddRow(this, index);
	const filter = getSelectFilter(this, index);

	if (filter.filters.length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one condition is required');
	}

	const updatedRows = await dataStoreProxy.updateRows({
		data: row,
		filter,
	});

	// The input object gets updated in the api call, somehow
	// And providing this column to the backend causes an unexpected column error
	// So let's just re-delete the field until we have a more aligned API
	delete row['updatedAt'];

	return updatedRows.map((json) => ({ json }));
}
