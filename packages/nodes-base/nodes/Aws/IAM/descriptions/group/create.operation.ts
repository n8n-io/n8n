import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { validatePath } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Group Name',
		name: 'newGroupName',
		default: '',
		placeholder: 'e.g. GroupName',
		description: 'The name of the new group to create',
		required: true,
		type: 'string',
		validateType: 'string',
		typeOptions: {
			maxLength: 128,
			regex: '^[+=,.@\\-_A-Za-z0-9]+$',
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		default: {},
		options: [
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'e.g. /division_abc/engineering/',
				description: 'The path to the group, if it is not included, it defaults to a slash (/)',
				validateType: 'string',
				routing: {
					send: {
						preSend: [validatePath],
						property: 'Path',
						type: 'query',
					},
				},
			},
		],
		placeholder: 'Add Option',
		type: 'collection',
	},
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
