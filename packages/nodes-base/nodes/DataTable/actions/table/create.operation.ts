import type {
	CreateDataTableColumnOptions,
	IDataObject,
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { getDataTableAggregateProxy } from '../../common/utils';

export const FIELD = 'create';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['table'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'tableName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. My Data Table',
		description: 'The name of the data table to create',
		displayOptions,
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		placeholder: 'Add Column',
		description: 'The columns to create in the data table',
		displayOptions,
		options: [
			{
				name: 'column',
				displayName: 'Column',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						required: true,
						description: 'The name of the column',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						default: 'string',
						options: [
							{ name: 'Boolean', value: 'boolean' },
							{ name: 'Date', value: 'date' },
							{ name: 'Number', value: 'number' },
							{ name: 'String', value: 'string' },
						],
						description: 'The type of the column',
					},
				],
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const tableName = this.getNodeParameter('tableName', index) as string;
	const columnsData = this.getNodeParameter('columns.column', index, []) as Array<{
		name: string;
		type: 'string' | 'number' | 'boolean' | 'date';
	}>;

	const columns: CreateDataTableColumnOptions[] = columnsData.map((col, idx) => ({
		name: col.name,
		type: col.type,
		index: idx,
	}));

	const aggregateProxy = await getDataTableAggregateProxy(this);

	const result = await aggregateProxy.createDataTable({
		name: tableName,
		columns,
	});

	return [{ json: result as unknown as IDataObject }];
}
