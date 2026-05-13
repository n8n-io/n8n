import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { getBoardProxyExecute, validateNonEmpty } from '../../common/utils';

export const FIELD = 'add';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['status'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'Status Name',
		name: 'statusName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Review',
		description: 'The name of the new status to add',
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getBoardProxyExecute(this, index);

	const statusName = validateNonEmpty(
		this.getNodeParameter('statusName', index),
		'Status name',
		this.getNode(),
	);

	const statuses = await proxy.addStatus(statusName);

	return [{ json: { statuses } }];
}
