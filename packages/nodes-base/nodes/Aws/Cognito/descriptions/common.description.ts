import type { INodeProperties } from 'n8n-workflow';

export const userPoolResourceLocator: INodeProperties = {
	displayName: 'User Pool',
	name: 'userPool',
	required: true,
	type: 'resourceLocator',
	default: {
		mode: 'list',
		value: '',
	},
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
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[\\w-]+_[0-9a-zA-Z]+$',
						errorMessage: 'The ID must follow the pattern "xxxxxx_xxxxxxxxxxx"',
					},
				},
			],
			placeholder: 'e.g. eu-central-1_ab12cdefgh',
		},
	],
};

export const groupResourceLocator: INodeProperties = {
	displayName: 'Group',
	name: 'group',
	default: {
		mode: 'list',
		value: '',
	},
	routing: {
		send: {
			type: 'body',
			property: 'GroupName',
		},
	},
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
};

export const userResourceLocator: INodeProperties = {
	displayName: 'User',
	name: 'user',
	default: {
		mode: 'list',
		value: '',
	},
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
};
