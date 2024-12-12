import type { INodeProperties } from 'n8n-workflow';

import {
	handleErrorPostReceive,
	handlePagination,
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
					request: {
						method: 'POST',
						url: '=/?Action=CreateGroup&Version=2010-05-08&GroupName={{$parameter["GroupName"]}}&Path={{$parameter["options.path"]}}',
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
					request: {
						method: 'POST',
						url: '=/?Action=DeleteGroup&Version=2010-05-08&GroupName={{$parameter["GroupName"]}}',
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
					request: {
						method: 'POST',
						url: '=/?Action=GetGroup&Version=2010-05-08&GroupName={{$parameter["GroupName"]}}',
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
						paginate: true,
					},
					operations: {
						pagination: handlePagination,
					},
					request: {
						method: 'POST',
						url: '=/?Action=ListGroups&Version=2010-05-08',
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
					request: {
						method: 'POST',
						url: '=/?Action=UpdateGroup&GroupName={{$parameter["GroupName"]}}&NewGroupName={{$parameter["NewGroupName"]}}&Version=2010-05-08&Path={{$parameter["options.path"]}}',
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
				name: 'path',
				type: 'string',
				default: '/',
				placeholder: 'e.g. /division_abc/engineering/',
				description: 'The path to the group, if it is not included, it defaults to a slash (/)',
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
				name: 'GroupName', //TODO Check if we can delete group by id
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
				displayName: 'By Name', //TODO Try find a way to get group by id
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
	//TODO Check whether we can add some filters and options about the fields to return
	{
		displayName: 'Simplified',
		name: 'simplified',
		type: 'boolean',
		default: false,
		description: 'Whether simplify the response if there are more than 10 fields',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				property: '$select',
				type: 'query',
				value: 'CreatedDate,Description,GroupName,LastModifiedDate,Precedence,',
			},
		},
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
				displayName: 'By Name', //TODO Try to get group by id
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
		placeholder: 'e.g. My New Group',
		description: 'The new name of the group',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['update'],
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
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '/',
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
