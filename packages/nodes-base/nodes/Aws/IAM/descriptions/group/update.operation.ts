import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { validatePath } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Group',
		name: 'group',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the group you want to update',
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchGroups',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'groupName',
				type: 'string',
				hint: 'Enter the group name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The group name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. Admins',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'New Name',
		name: 'newGroupName',
		default: '',
		required: true,
		placeholder: 'e.g. GroupName',
		description: 'The new name of the group',
		type: 'string',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		default: {},
		options: [
			{
				displayName: 'New Path',
				name: 'newPath',
				type: 'string',
				default: '',
				placeholder: 'e.g. /division_abc/engineering/',
				description: 'The path to the group, if it is not included, it defaults to a slash (/)',
				routing: {
					send: {
						preSend: [validatePath],
						property: 'NewPath',
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
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
