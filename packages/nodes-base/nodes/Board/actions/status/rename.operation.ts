import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { getBoardProxyExecute, validateNonEmpty } from '../../common/utils';

export const FIELD = 'rename';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['status'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Current Status',
		name: 'oldStatus',
		type: 'options',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'The status to rename',
		typeOptions: {
			loadOptionsDependsOn: ['boardId.value'],
			loadOptionsMethod: 'getBoardStatuses',
		},
		default: '',
		displayOptions,
	},
	{
		displayName: 'New Name',
		name: 'newStatus',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. In Review',
		description: 'The new name for the status',
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getBoardProxyExecute(this, index);

	const oldStatus = this.getNodeParameter('oldStatus', index) as string;
	const newStatus = validateNonEmpty(
		this.getNodeParameter('newStatus', index),
		'New status name',
		this.getNode(),
	);

	const statuses = await proxy.renameStatus(oldStatus, newStatus);

	return [{ json: { statuses } }];
}
