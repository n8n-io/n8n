import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { userResourceLocator } from '../../helpers/resourceLocators';
import { validatePath } from '../../helpers/utils';

const properties: INodeProperties[] = [
	...userResourceLocator,
	{
		displayName: 'New User Name',
		name: 'newUserName',
		default: '',
		placeholder: 'e.g. JohnSmith',
		type: 'string',
		validateType: 'string',
		required: true,
		typeOptions: {
			regex: '^[a-zA-Z0-9+=,.@_-]+$',
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'New Path',
				name: 'newPath',
				type: 'string',
				validateType: 'string',
				default: '/',
				placeholder: 'e.g. /division_abc/subdivision_xyz/',
				routing: {
					send: {
						preSend: [validatePath],
						property: 'newPath',
						value: '={{ $value }}',
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
