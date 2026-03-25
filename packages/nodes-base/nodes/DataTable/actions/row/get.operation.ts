import {
	DATA_TABLE_SYSTEM_COLUMNS,
	NodeOperationError,
	type IDisplayOptions,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { ROWS_LIMIT_DEFAULT } from '../../common/constants';
import { executeSelectMany, getSelectFields } from '../../common/selectMany';
import { getDataTableProxyExecute } from '../../common/utils';

export const FIELD: string = 'get';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['row'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	...getSelectFields(displayOptions),
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions,
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			...displayOptions,
			show: {
				...displayOptions.show,
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: ROWS_LIMIT_DEFAULT,
		description: 'Max number of results to return',
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const dataTableProxy = await getDataTableProxyExecute(this, index);

	// Extract sort parameters
	const orderBy = this.getNodeParameter('orderBy', index, false) as boolean;

	if (orderBy) {
		const column = this.getNodeParameter('orderByColumn', index, '') as string;
		if (column) {
			const availableColumns = await dataTableProxy.getColumns();
			const isSystemColumn = DATA_TABLE_SYSTEM_COLUMNS.includes(column);
			if (!isSystemColumn && !availableColumns.find((x) => x.name === column))
				throw new NodeOperationError(this.getNode(), 'Specified column does not exist');
		}
	}

	return await executeSelectMany(this, index, dataTableProxy);
}
