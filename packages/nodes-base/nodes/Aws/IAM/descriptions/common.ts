import type { INodeProperties } from 'n8n-workflow';

import { validateName } from '../helpers/utils';

export const paginationParameters: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		default: 100,
		type: 'number',
		validateType: 'number',
		typeOptions: {
			minValue: 1,
		},
		description: 'Max number of results to return',
		displayOptions: {
			hide: {
				returnAll: [true],
			},
		},
		routing: {
			send: {
				property: 'MaxItems',
				type: 'body',
				value: '={{ $value }}',
			},
		},
	},
];

export const userLocator: INodeProperties = {
	displayName: 'User',
	name: 'user',
	required: true,
	type: 'resourceLocator',
	default: {
		mode: 'list',
		value: '',
	},
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
			placeholder: 'e.g. Admins',
			hint: 'Enter the user name',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[\\w+=,.@-]+$',
						errorMessage: 'The user name must follow the allowed pattern',
					},
				},
			],
		},
	],
};

export const groupLocator: INodeProperties = {
	displayName: 'Group',
	name: 'group',
	required: true,
	type: 'resourceLocator',
	default: {
		mode: 'list',
		value: '',
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
			placeholder: 'e.g. Admins',
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
		},
	],
};

export const pathParameter: INodeProperties = {
	displayName: 'Path',
	name: 'path',
	type: 'string',
	validateType: 'string',
	default: '/',
};

export const groupNameParameter: INodeProperties = {
	displayName: 'Group Name',
	name: 'groupName',
	required: true,
	type: 'string',
	validateType: 'string',
	typeOptions: {
		maxLength: 128,
		regex: '^[+=,.@\\-_A-Za-z0-9]+$',
	},
	default: '',
	placeholder: 'e.g. GroupName',
	routing: {
		send: {
			preSend: [validateName],
		},
	},
};

export const userNameParameter: INodeProperties = {
	displayName: 'User Name',
	name: 'userName',
	required: true,
	type: 'string',
	validateType: 'string',
	default: '',
	placeholder: 'e.g. JohnSmith',
	typeOptions: {
		maxLength: 64,
		regex: '^[A-Za-z0-9+=,\\.@_-]+$',
	},
	routing: {
		send: {
			preSend: [validateName],
		},
	},
};
