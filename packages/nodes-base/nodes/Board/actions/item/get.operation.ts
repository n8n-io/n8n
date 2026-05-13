import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { getBoardProxyExecute } from '../../common/utils';

export const FIELD = 'get';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['item'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions,
		default: true,
		description: 'Whether to return all items or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				...displayOptions.show,
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of items to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions,
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Filter by Status',
				name: 'filterStatus',
				type: 'options',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description: 'Only return items with this status',
				typeOptions: {
					loadOptionsDependsOn: ['boardId.value'],
					loadOptionsMethod: 'getBoardStatuses',
				},
				default: '',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getBoardProxyExecute(this, index);

	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);
	const options = this.getNodeParameter('options', index, {}) as {
		filterStatus?: string;
	};

	const result = await proxy.getItems({
		status: options.filterStatus || undefined,
		take: limit,
	});

	return result.data.map((json) => ({ json }));
}
