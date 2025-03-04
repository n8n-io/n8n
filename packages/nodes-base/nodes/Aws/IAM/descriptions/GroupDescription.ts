import type { INodeProperties } from 'n8n-workflow';

import {
	handleErrorPostReceive,
	handlePagination,
	preDeleteGroup,
	presendGroupFields,
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
						preSend: [presendGroupFields],
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
						preSend: [presendGroupFields, preDeleteGroup],
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
						preSend: [presendGroupFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=GetGroup&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive, processGroupsResponse],
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
						preSend: [presendGroupFields],
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
						preSend: [presendGroupFields],
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
		name: 'NewName',
		default: '',
		placeholder: 'e.g. GroupName',
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
		typeOptions: {
			maxLength: 128,
			regex: '^[+=,.@\\-_A-Za-z0-9]+$',
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
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
	{
		displayName: 'Include Users',
		name: 'includeUsers',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['get'],
			},
		},
		default: false,
		description: 'Whether to include a list of users in the group',
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
	{
		displayName: 'Include Users',
		name: 'includeUsers',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to include a list of users in the group',
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
	{
		displayName: 'New Name',
		name: 'NewGroupName',
		default: '',
		required: true,
		placeholder: 'e.g. GroupName',
		description: 'The new name of the group',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		default: {},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'New Path',
				name: 'NewPath',
				type: 'string',
				default: '',
				placeholder: 'e.g. /division_abc/engineering/',
				description: 'The path to the group, if it is not included, it defaults to a slash (/)',
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
