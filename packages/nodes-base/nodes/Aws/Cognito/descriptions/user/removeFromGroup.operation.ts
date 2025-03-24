import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'User Pool',
		name: 'userPoolId',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'The user pool where the users are managed',
		routing: {
			send: {
				type: 'body',
				property: 'UserPoolId',
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchUserPools',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the user pool',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[a-zA-Z0-9-]+_[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xx-xx-xx_xxxxxx"',
						},
					},
				],
				placeholder: 'e.g. eu-central-1_ab12cdefgh',
			},
		],
	},
	{
		displayName: 'User',
		name: 'userName',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the user you want to remove from the group',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchUsers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the user ID',
				placeholder: 'e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w-]+-[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xxxxxx-xxxxxxxxxxx"',
						},
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'Username',
			},
		},
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Group',
		name: 'groupName',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the group you want to remove the user from',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchGroupsForUser',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'GroupName',
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
		routing: {
			send: {
				type: 'body',
				property: 'GroupName',
			},
		},
		type: 'resourceLocator',
	},
];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['removeFromGroup'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
