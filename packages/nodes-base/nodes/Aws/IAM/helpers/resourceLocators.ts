import type { INodeProperties } from 'n8n-workflow';

export const groupResourceLocator: INodeProperties[] = [
	{
		displayName: 'Group',
		name: 'group',
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the group you want to delete',
		required: true,
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
	},
];

export const userResourceLocator: INodeProperties[] = [
	{
		displayName: 'User',
		name: 'user',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the user you want to add to the group',
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchUsers',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'userName',
				type: 'string',
				hint: 'Enter the user name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The user name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. Admins',
			},
		],
	},
];
