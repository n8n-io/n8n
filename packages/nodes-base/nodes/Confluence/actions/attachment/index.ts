import type { INodeProperties } from 'n8n-workflow';

import * as deleteAttachment from './delete.operation';
import * as getMany from './getMany.operation';

export { deleteAttachment as delete, getMany };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['attachment'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Move an attachment to the trash, or permanently delete it',
				action: 'Delete an attachment',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List the attachments on a page, optionally downloading each file',
				action: 'Get many attachments',
			},
		],
		// Not the first option: the default must stay non-destructive
		default: 'getMany',
	},
	...deleteAttachment.description,
	...getMany.description,
];
