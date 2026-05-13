import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getBoardProxyExecute } from '../../common/utils';

export const FIELD = 'reorder';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['status'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'New Order',
		name: 'statusOrder',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. To Do, In Progress, Review, Done',
		description:
			'Comma-separated list of all statuses in the desired order. Must include all existing statuses.',
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getBoardProxyExecute(this, index);

	const statusOrderRaw = this.getNodeParameter('statusOrder', index) as string;
	const orderedStatuses = statusOrderRaw
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	if (orderedStatuses.length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one status must be provided');
	}

	const statuses = await proxy.reorderStatuses(orderedStatuses);

	return [{ json: { statuses } }];
}
