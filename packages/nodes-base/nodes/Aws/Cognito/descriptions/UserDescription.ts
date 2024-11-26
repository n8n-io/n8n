import type { INodeProperties } from 'n8n-workflow';

import { handleErrorPostReceive, presendFilter, presendTest } from '../GenericFunctions';

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
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminAddUserToGroup',
						},
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
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminCreateUser',
						},
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
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminDeleteUser',
						},
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve information of a user',
				action: 'Get user',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminGetUser',
						},
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many users',
				routing: {
					send: {
						paginate: true,
					},
					// ToDo: Test with pagination (ideally we need 4+ users in the user pool)
					// operations: { pagination: handlePagination }, // Responsible for pagination and number of results returned
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers',
						},
						qs: {
							pageSize:
								'={{ $parameter["limit"] ? ($parameter["limit"] < 60 ? $parameter["limit"] : 60) : 60 }}', // The API allows maximum 60 results per page
						},
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
			},
			{
				name: 'Remove From Group',
				value: 'removeFromGroup',
				description: 'Remove a user from a group',
				action: 'Remove user from group',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminRemoveUserFromGroup',
						},
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
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminUpdateUserAttributes',
						},
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
		displayName: 'User Pool ID',
		name: 'userPoolId',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'The user pool ID where the users are managed',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'UserPoolId',
			},
		},
		modes: [
			{
				displayName: 'From list', // ToDo: Fix error when selecting this option
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
				hint: 'Enter the user pool ID',
				placeholder: 'e.g. eu-central-1_ab12cdefgh',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w-]+_[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xxxxxx_xxxxxxxxxxx"',
						},
					},
				],
			},
		],
	},
	{
		displayName: 'Username',
		name: 'Username',
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
		routing: {
			send: {
				property: 'Username',
				type: 'body',
				preSend: [presendTest],
			},
		},
		type: 'string',
		validateType: 'string',
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
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Path',
				name: 'Path',
				type: 'string',
				validateType: 'string',
				default: '/',
				placeholder: 'e.g. /division_abc/engineering/',
				description:
					'The path for the user name, if it is not included, it defaults to a slash (/)',
				routing: {
					send: {
						property: 'Path',
						type: 'body',
						preSend: [presendTest],
					},
				},
			},
			{
				displayName: 'Permissions Boundary',
				name: 'PermissionsBoundary',
				type: 'string',
				validateType: 'string',
				default: '',
				placeholder: 'e.g. arn:aws:iam::123456789012:policy/ExampleBoundaryPolicy',
				description: 'Enter the ARN of a policy to set as the Permissions Boundary',
				routing: {
					send: {
						property: 'PermissionsBoundary',
						type: 'body',
						preSend: [presendTest],
					},
				},
			},
			{
				displayName: 'Tags',
				name: 'Tags',
				type: 'multiOptions',
				placeholder: 'Add Tags',
				default: [],
				description: 'A list of tags that you want to attach to the new user',
				//TO-DO-GET TAGS LIST
				options: [],
				routing: {
					send: {
						property: 'Tags',
						type: 'body',
						preSend: [presendTest],
					},
				},
			},
		],
	},
];

const getFields: INodeProperties[] = [
	{
		displayName: 'User Pool ID',
		name: 'userPoolId',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'The user pool ID where the users are managed',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'UserPoolId',
				preSend: [presendTest],
			},
		},
		modes: [
			{
				displayName: 'From list', // ToDo: Fix error when selecting this option
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
				hint: 'Enter the user pool ID',
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
	},
	{
		displayName: 'User Name',
		name: 'Username',
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
							regex: '^[\\w-]+_[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xxxxxx_xxxxxxxxxxx"',
						},
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'Username',
				preSend: [presendTest],
			},
		},
		required: true,
		type: 'resourceLocator',
	},
];

const getAllFields: INodeProperties[] = [
	{
		displayName: 'User Pool ID',
		name: 'userPoolId',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'The user pool ID that the users are in', // ToDo: Improve description
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'UserPoolId',
			},
		},
		modes: [
			{
				displayName: 'From list', // ToDo: Fix error when selecting this option
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
				hint: 'Enter the user pool ID',
				placeholder: 'e.g. eu-central-1_ab12cdefgh',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w-]+_[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xxxxxx_xxxxxxxxxxx"',
						},
					},
				],
			},
		],
	},
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
		routing: {
			send: {
				paginate: '={{ $value }}',
			},
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ !!$response.body?.["@odata.nextLink"] }}',
						request: {
							url: '={{ $response.body?.["@odata.nextLink"] ?? $request.url }}',
							qs: {
								$filter:
									'={{ !!$response.body?.["@odata.nextLink"] ? undefined : $request.qs?.$filter }}',
								$select:
									'={{ !!$response.body?.["@odata.nextLink"] ? undefined : $request.qs?.$select }}',
							},
						},
					},
				},
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
		displayName: 'Additional Fields', // ToDo: Test additional parameters with the API
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['user'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Attributes To Get',
				name: 'attributesToGet',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Attribute',
				description:
					'The attributes to return in the response. They can be only required attributes in your user pool, or in conjunction with Filter.' +
					'Amazon Cognito returns an error if not all users in the results have set a value for the attribute you request.' +
					"Attributes that you can't filter on, including custom attributes, must have a value set in every " +
					'user profile before an AttributesToGet parameter returns results. e.g. ToDo', // ToDo: Improve description
				options: [
					{
						name: 'metadataValues',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Attribute',
								name: 'attribute',
								type: 'string',
								default: '',
								description: 'The attribute name to return',
							},
						],
					},
				],
				routing: {
					send: {
						type: 'body',
						property: 'AttributesToGet',
						value: '={{ $value.metadataValues.map(attribute => attribute.attribute) }}',
					},
				},
			},
			{
				displayName: 'Filter Attribute',
				name: 'filterAttribute',
				type: 'options',
				default: 'username',
				description: 'The attribute to search for',
				options: [
					{ name: 'Cognito User Status', value: 'cognito:user_status' },
					{ name: 'Email', value: 'email' },
					{ name: 'Family Name', value: 'family_name' },
					{ name: 'Given Name', value: 'given_name' },
					{ name: 'Name', value: 'name' },
					{ name: 'Phone Number', value: 'phone_number' },
					{ name: 'Preferred Username', value: 'preferred_username' },
					{ name: 'Status (Enabled)', value: 'status' },
					{ name: 'Sub', value: 'sub' },
					{ name: 'Username', value: 'username' },
				],
			},
			{
				displayName: 'Filter Type',
				name: 'filterType',
				type: 'options',
				default: 'exactMatch',
				description: 'The matching strategy of the filter',
				options: [
					{ name: 'Exact Match', value: 'exactMatch' },
					{ name: 'Starts With', value: 'startsWith' },
				],
			},
			{
				displayName: 'Filter Value',
				name: 'filterValue',
				type: 'string',
				default: '',
				description: 'The value of the attribute to search for',
				routing: {
					send: {
						preSend: [presendFilter],
					},
				},
			},
		],
	},
];

const deleteFields: INodeProperties[] = [
	{
		displayName: 'User Pool ID',
		name: 'userPoolId',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'The user pool ID where the users are managed',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'UserPoolId',
				preSend: [presendTest],
			},
		},
		modes: [
			{
				displayName: 'From list', // ToDo: Fix error when selecting this option
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
				hint: 'Enter the user pool ID',
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
	},
	{
		displayName: 'User Name',
		name: 'Username',
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
							regex: '^[\\w-]+_[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xxxxxx_xxxxxxxxxxx"',
						},
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'Username',
				preSend: [presendTest],
			},
		},
		required: true,
		type: 'resourceLocator',
	},
];

const updateFields: INodeProperties[] = [
	{
		displayName: 'User Pool ID',
		name: 'userPoolId',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'The user pool ID where the users are managed',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'UserPoolId',
				preSend: [presendTest],
			},
		},
		modes: [
			{
				displayName: 'From list', // ToDo: Fix error when selecting this option
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
				hint: 'Enter the user pool ID',
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
	},
	{
		displayName: 'User Name',
		name: 'Username',
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
							regex: '^[\\w-]+_[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xxxxxx_xxxxxxxxxxx"',
						},
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'Username',
				preSend: [presendTest],
			},
		},
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'User Attributes',
		name: 'UserAttributes',
		type: 'fixedCollection',
		placeholder: 'Add Attribute',
		default: {
			attributes: [],
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
		description: 'Attributes to update for the user',
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Attributes',
				name: 'attributes',
				values: [
					{
						displayName: 'Name',
						name: 'Name',
						type: 'string',
						default: '',
						description: 'The name of the attribute (e.g., custom:deliverables)',
					},
					{
						displayName: 'Value',
						name: 'Value',
						type: 'string',
						default: '',
						description: 'The value of the attribute',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'UserAttributes',
				value:
					'={{ $value.attributes?.map(attribute => ({ Name: attribute.Name, Value: attribute.Value })) || [] }}',
			},
		},
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
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Client Metadata',
				name: 'clientMetadata',
				type: 'fixedCollection',
				placeholder: 'Add Metadata Pair',
				default: { metadata: [] },
				description: 'A map of custom key-value pairs for workflows triggered by this action',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Metadata',
						name: 'metadata',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'The key of the metadata attribute',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value of the metadata attribute',
							},
						],
					},
				],
				routing: {
					send: {
						type: 'body',
						property: 'ClientMetadata',
						value:
							'={{ $value.metadata && $value.metadata.length > 0 ? Object.fromEntries($value.metadata.map(attribute => [attribute.Name, attribute.Value])) : {} }}',
					},
				},
			},
		],
	},
];

const addToGroupFields: INodeProperties[] = [
	{
		displayName: 'User Pool ID',
		name: 'userPoolId',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'The user pool ID where the users are managed',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['addToGroup'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'UserPoolId',
			},
		},
		modes: [
			{
				displayName: 'From list', // ToDo: Fix error when selecting this option
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
				hint: 'Enter the user pool ID',
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
	},
	{
		displayName: 'User Name',
		name: 'Username',
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
							regex: '^[\\w-]+_[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xxxxxx_xxxxxxxxxxx"',
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
		displayName: 'Group Name',
		name: 'GroupName',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the group you want to update',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['addToGroup'],
			},
		},
		modes: [
			{
				displayName: 'From List',
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
		routing: {
			send: {
				preSend: [presendTest], // ToDo: Remove this line before completing the pull request
				type: 'body',
				property: 'GroupName',
			},
		},
		type: 'resourceLocator',
	},
];

const removeFromGroupFields: INodeProperties[] = [
	{
		displayName: 'User Pool ID',
		name: 'userPoolId',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'The user pool ID where the users are managed',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['removeFromGroup'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'UserPoolId',
			},
		},
		modes: [
			{
				displayName: 'From list', // ToDo: Fix error when selecting this option
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
				hint: 'Enter the user pool ID',
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
	},
	{
		displayName: 'User Name',
		name: 'Username',
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
							regex: '^[\\w-]+_[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xxxxxx_xxxxxxxxxxx"',
						},
					},
				],
			},
		],
		routing: {
			send: {
				preSend: [presendTest], // ToDo: Remove this line before completing the pull request
				type: 'body',
				property: 'Username',
			},
		},
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Group Name',
		name: 'GroupName',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the group you want to update',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['removeFromGroup'],
			},
		},
		modes: [
			{
				displayName: 'From List',
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
		routing: {
			send: {
				preSend: [presendTest], // ToDo: Remove this line before completing the pull request
				type: 'body',
				property: 'GroupName',
			},
		},
		type: 'resourceLocator',
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
