import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { getBoardProxyExecute } from '../../common/utils';

export const FIELD = 'deleteStatus';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['status'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Status to Delete',
		name: 'statusToDelete',
		type: 'options',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'The status to remove from the board',
		typeOptions: {
			loadOptionsDependsOn: ['boardId.value'],
			loadOptionsMethod: 'getBoardStatuses',
		},
		default: '',
		displayOptions,
	},
	{
		displayName: 'Migrate Items',
		name: 'migrateItems',
		type: 'boolean',
		default: true,
		description: 'Whether to move existing items to another status instead of deleting them',
		displayOptions,
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Move To Status',
		name: 'migrateTo',
		type: 'options',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'Move existing items to this status',
		typeOptions: {
			loadOptionsDependsOn: ['boardId.value'],
			loadOptionsMethod: 'getBoardStatuses',
		},
		default: '',
		displayOptions: {
			show: {
				...displayOptions.show,
				migrateItems: [true],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getBoardProxyExecute(this, index);

	const statusToDelete = this.getNodeParameter('statusToDelete', index) as string;
	const migrateItems = this.getNodeParameter('migrateItems', index) as boolean;
	const migrateTo = migrateItems
		? (this.getNodeParameter('migrateTo', index) as string)
		: undefined;

	const statuses = await proxy.deleteStatus(statusToDelete, migrateTo);

	return [{ json: { statuses } }];
}
