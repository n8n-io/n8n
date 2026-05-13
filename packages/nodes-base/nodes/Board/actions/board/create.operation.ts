import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getBoardAggregateProxy, validateNonEmpty } from '../../common/utils';

export const FIELD = 'create';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['board'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'boardName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. My Kanban Board',
		description: 'The name of the board to create',
		displayOptions,
	},
	{
		displayName: 'Statuses',
		name: 'statuses',
		type: 'string',
		required: true,
		default: 'To Do, In Progress, Done',
		placeholder: 'e.g. To Do, In Progress, Done',
		description: 'Comma-separated list of statuses for the board columns',
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const boardName = validateNonEmpty(
		this.getNodeParameter('boardName', index),
		'Board name',
		this.getNode(),
	);
	const statusesRaw = this.getNodeParameter('statuses', index) as string;

	const statuses = statusesRaw
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	if (statuses.length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one status is required');
	}

	const proxy = await getBoardAggregateProxy(this);
	const result = await proxy.createBoard({ name: boardName, statuses });

	return [{ json: { ...result } }];
}
