import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

const properties: INodeProperties[] = [
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
	{
		displayName: 'Group',
		name: 'group',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the group you want to add the user to',
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

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['addToGroup'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
