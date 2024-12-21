import type { INodeProperties } from 'n8n-workflow';

import {
	handleErrorPostReceive,
	handlePagination,
	presendFields,
	processGroupsResponse,
} from '../GenericFunctions';

export const groupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		displayOptions: {
			show: {
				resource: ['group'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new group',
				routing: {
					send: {
						preSend: [presendFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=CreateGroup&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Create group',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an existing group',
				routing: {
					send: {
						preSend: [presendFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=DeleteGroup&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Delete group',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve details of an existing group',
				routing: {
					send: {
						preSend: [presendFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=GetGroup&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Get group',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of groups',
				routing: {
					send: {
						preSend: [presendFields],
						paginate: true,
					},
					operations: {
						pagination: handlePagination,
					},
					request: {
						method: 'POST',
						url: '/?Action=ListGroups&Version=2010-05-08',
						qs: {
							pageSize:
								'={{ $parameter["limit"] ? ($parameter["limit"] < 60 ? $parameter["limit"] : 60) : 60 }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive, processGroupsResponse],
					},
				},
				action: 'Get many groups',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing group',
				routing: {
					send: {
						preSend: [presendFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=UpdateGroup&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Update group',
			},
		],
	},
];

const createFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'GroupName',
		default: '',
		placeholder: 'e.g. My New Group',
		description: 'The name of the new group to create',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['create'],
			},
		},
		required: true,
		type: 'string',
		validateType: 'string',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Path',
				name: 'Path',
				type: 'string',
				default: '',
				placeholder: 'e.g. /division_abc/engineering/',
				description: 'The path to the group, if it is not included, it defaults to a slash (/)',
				validateType: 'string',
			},
		],
		placeholder: 'Add Option',
		type: 'collection',
	},
];

const deleteFields: INodeProperties[] = [
	{
		displayName: 'Group',
		name: 'GroupName',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the group you want to delete',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['delete'],
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
		type: 'resourceLocator',
	},
];

const getFields: INodeProperties[] = [
	{
		displayName: 'Group',
		name: 'GroupName',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the group you want to retrieve',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['get'],
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
	},
];

const getAllFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
			},
		},
		type: 'boolean',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		routing: {
			send: {
				property: '$top',
				type: 'query',
				value: '={{ $value }}',
			},
		},
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		validateType: 'number',
	},
];

const updateFields: INodeProperties[] = [
	{
		displayName: 'Group',
		name: 'GroupName',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the group you want to update',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['update'],
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
				name: 'Group Name',
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
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'New Name',
				name: 'NewGroupName',
				default: '',
				placeholder: 'e.g. My New Group',
				description: 'The new name of the group',
				type: 'string',
				typeOptions: {
					regex: '^[a-zA-Z0-9+=,.@_-]+$',
				},
				validateType: 'string',
			},
			{
				displayName: 'New Path',
				name: 'NewPath',
				type: 'string',
				default: '',
				placeholder: 'e.g. /division_abc/engineering/',
				description: 'The path to the group, if it is not included, it defaults to a slash (/)',
				validateType: 'string',
			},
		],
		placeholder: 'Add Option',
		type: 'collection',
	},
];

export const groupFields: INodeProperties[] = [
	...createFields,
	...deleteFields,
	...getFields,
	...getAllFields,
	...updateFields,
];
