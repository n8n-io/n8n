import type { INodeProperties } from 'n8n-workflow';

import {
	handleErrorPostReceive,
	handlePagination,
	presendFields,
	processUsersResponse,
} from '../GenericFunctions';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Add to Group',
				value: 'addToGroup',
				description: 'Add an existing user to a group',
				action: 'Add user to group',
				routing: {
					send: {
						preSend: [presendFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=AddUserToGroup&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new user',
				action: 'Create user',
				routing: {
					send: {
						preSend: [presendFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=CreateUser&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user',
				action: 'Delete user',
				routing: {
					send: {
						preSend: [presendFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=DeleteUser&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve information of an user',
				action: 'Get user',
				routing: {
					send: {
						preSend: [presendFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=GetUser&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of users',
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
						url: '/?Action=ListUsers&Version=2010-05-08',
						qs: {
							pageSize:
								'={{ $parameter["limit"] ? ($parameter["limit"] < 60 ? $parameter["limit"] : 60) : 60 }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive, processUsersResponse],
					},
				},
				action: 'Get many users',
			},
			{
				name: 'Remove From Group',
				value: 'removeFromGroup',
				description: 'Remove a user from a group',
				action: 'Remove user from group',
				routing: {
					send: {
						preSend: [presendFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=RemoveUserFromGroup&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a user',
				action: 'Update user',
				routing: {
					send: {
						preSend: [presendFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=UpdateUser&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
			},
		],
	},
];

const createFields: INodeProperties[] = [
	{
		displayName: 'User Name',
		name: 'UserName',
		default: '',
		description: 'The username of the new user to create',
		placeholder: 'e.g. JohnSmith',
		displayOptions: {
			show: {
				resource: ['user'],
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
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['user'], operation: ['create'] } },
		options: [
			{
				displayName: 'Path',
				name: 'Path',
				type: 'string',
				validateType: 'string',
				default: '',
				description: 'The path for the user name',
				placeholder: 'e.g. /division_abc/subdivision_xyz/',
			},
			{
				displayName: 'Permissions Boundary',
				name: 'PermissionsBoundary',
				default: '',
				description:
					'The ARN of the managed policy that is used to set the permissions boundary for the user',
				placeholder: 'e.g. iam:CreateUser',
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Tags',
				name: 'Tags',
				type: 'fixedCollection',
				description: 'A list of tags that you want to attach to the new user',
				default: [],
				placeholder: 'Add Tag',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'tags',
						displayName: 'Tag',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								placeholder: 'e.g., Department',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'e.g., Engineering',
							},
						],
					},
				],
			},
		],
	},
];

const getFields: INodeProperties[] = [
	{
		displayName: 'User',
		name: 'UserName',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the user you want to retrieve',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
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
				name: 'User Name',
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

const getAllFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['user'],
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
				resource: ['user'],
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Path Prefix',
				name: 'PathPrefix',
				type: 'string',
				validateType: 'string',
				default: '/',
				description: 'The path prefix for filtering the results',
				placeholder: 'e.g. /division_abc/subdivision_xyz/',
			},
		],
	},
];

const deleteFields: INodeProperties[] = [
	{
		displayName: 'User',
		name: 'UserName',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the user you want to delete',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete'],
			},
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
				name: 'User Name',
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

const updateFields: INodeProperties[] = [
	{
		displayName: 'User',
		name: 'UserName',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the user you want to update',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
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
				name: 'User Name',
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
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'New User Name',
				name: 'NewUserName',
				default: '',
				placeholder: 'e.g. JohnSmith',
				type: 'string',
				validateType: 'string',
				typeOptions: {
					regex: '^[a-zA-Z0-9+=,.@_-]+$',
				},
			},
			{
				displayName: 'New Path',
				name: 'NewPath',
				type: 'string',
				validateType: 'string',
				default: '/',
				placeholder: 'e.g. /division_abc/subdivision_xyz/',
			},
		],
	},
];

const addToGroupFields: INodeProperties[] = [
	{
		displayName: 'User',
		name: 'UserName',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the user you want to add to the group',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['addToGroup'],
			},
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
				name: 'User Name',
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
		name: 'GroupName',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the group you want to add the user to',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['addToGroup'],
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
				name: 'User Name',
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

const removeFromGroupFields: INodeProperties[] = [
	{
		displayName: 'User',
		name: 'UserName',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the user you want to remove from the group',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['removeFromGroup'],
			},
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
				name: 'User Name',
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
		name: 'GroupName',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the group you want to remove the user from',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['removeFromGroup'],
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
				name: 'User Name',
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

export const userFields: INodeProperties[] = [
	...getAllFields,
	...createFields,
	...deleteFields,
	...getFields,
	...updateFields,
	...addToGroupFields,
	...removeFromGroupFields,
];
