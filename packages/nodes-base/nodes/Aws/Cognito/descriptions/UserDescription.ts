import type { INodeProperties } from 'n8n-workflow';

import { handleErrorPostReceive } from '../generalFunctions/errorHandling';
import { simplifyData } from '../generalFunctions/helpers';
import { handlePagination } from '../generalFunctions/pagination';
import {
	presendAttributes,
	presendFilters,
	presendUserFields,
} from '../generalFunctions/presendFunctions';

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
						preSend: [presendUserFields],
					},
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminAddUserToGroup',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							{
								type: 'set',
								properties: {
									value: '={{ { "addedToGroup": true } }}',
								},
							},
						],
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
						preSend: [presendUserFields],
					},
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminCreateUser',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							{
								type: 'rootProperty',
								properties: {
									property: 'User',
								},
							},
						],
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
						preSend: [presendUserFields],
					},
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminDeleteUser',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve information of a user',
				action: 'Get user',
				routing: {
					send: {
						preSend: [presendUserFields],
					},
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminGetUser',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [simplifyData, handleErrorPostReceive],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of users',
				routing: {
					send: {
						paginate: true,
						preSend: [presendFilters],
					},
					operations: { pagination: handlePagination },
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers',
						},
						qs: {
							pageSize:
								'={{ $parameter["limit"] ? ($parameter["limit"] < 60 ? $parameter["limit"] : 60) : 60 }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							simplifyData,
							handleErrorPostReceive,
							{
								type: 'rootProperty',
								properties: {
									property: 'Users',
								},
							},
						],
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
						preSend: [presendUserFields],
					},
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminRemoveUserFromGroup',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							{
								type: 'set',
								properties: {
									value: '={{ { "removedFromGroup": true } }}',
								},
							},
						],
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
						preSend: [presendAttributes, presendUserFields],
					},
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminUpdateUserAttributes',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							{
								type: 'set',
								properties: {
									value: '={{ { "updated": true } }}',
								},
							},
						],
					},
				},
			},
		],
	},
];

const createFields: INodeProperties[] = [
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
				placeholder: 'e.g. eu-central-1_ab12cdefgh',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[a-zA-Z0-9-]+_[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xx-xx-xx_xxxxxx"',
						},
					},
				],
			},
		],
	},
	{
		displayName: 'User Name',
		name: 'newUserName',
		default: '',
		description:
			'Depending on the user pool settings, this parameter requires the username, the email, or the phone number. No whitespace is allowed.',
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
			},
		},
		type: 'string',
		validateType: 'string',
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
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Message Action',
				name: 'messageAction',
				default: 'RESEND',
				description:
					"Set to RESEND to resend the invitation message to a user that already exists and reset the expiration limit on the user's account. Set to SUPPRESS to suppress sending the message.",
				type: 'options',
				options: [
					{
						name: 'Resend',
						value: 'RESEND',
					},
					{
						name: 'Suppress',
						value: 'SUPPRESS',
					},
				],
				routing: {
					send: {
						property: 'MessageAction',
						type: 'body',
					},
				},
			},
			{
				displayName: 'Force Alias Creation',
				name: 'forceAliasCreation',
				type: 'boolean',
				validateType: 'boolean',
				default: false,
				description:
					'Whether this parameter is used only if the phone_number_verified or email_verified attribute is set to True. Otherwise, it is ignored. If set to True, and the phone number or email address specified in the UserAttributes parameter already exists as an alias with a different user, the alias will be migrated. If set to False, an AliasExistsException error is thrown if the alias already exists',
				routing: {
					send: {
						type: 'body',
						property: 'ForceAliasCreation',
					},
				},
			},
			{
				displayName: 'Desired Delivery Mediums',
				name: 'desiredDeliveryMediums',
				default: ['SMS'],
				description:
					'Specify EMAIL if email will be used to send the welcome message. Specify SMS if the phone number will be used. The default value is SMS. You can specify more than one value.',
				type: 'multiOptions',
				options: [
					{
						name: 'SMS',
						value: 'SMS',
					},
					{
						name: 'Email',
						value: 'EMAIL',
					},
				],
				routing: {
					send: {
						property: 'DesiredDeliveryMediums',
						type: 'body',
					},
				},
			},
			{
				displayName: 'Temporary Password',
				name: 'temporaryPasswordOptions',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					"The user's temporary password that will be valid only once. If not set, Amazon Cognito will automatically generate one for you.",
				routing: {
					send: {
						property: 'TemporaryPassword',
						type: 'body',
					},
				},
			},
		],
	},
];

const getFields: INodeProperties[] = [
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
							regex: '^[\\w-]+-[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xxxxxx-xxxxxxxxxxx"',
						},
					},
				],
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

const getAllFields: INodeProperties[] = [
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
				placeholder: 'e.g. eu-central-1_ab12cdefgh',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[a-zA-Z0-9-]+_[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xx-xx-xx_xxxxxx"',
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
		displayOptions: { show: { resource: ['user'], operation: ['getAll'] } },
		type: 'boolean',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		required: true,
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 20,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['user'], operation: ['getAll'], returnAll: [false] } },
		routing: { send: { type: 'body', property: 'Limit' } },
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'fixedCollection',
		placeholder: 'Add Filter',
		default: [],
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Filter',
				name: 'filter',
				values: [
					{
						displayName: 'Attribute',
						name: 'attribute',
						type: 'options',
						default: 'email',
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
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'The value of the attribute to search for',
					},
				],
			},
		],
	},
];

const deleteFields: INodeProperties[] = [
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
];

const updateFields: INodeProperties[] = [
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
		displayName: 'User Attributes',
		name: 'userAttributes',
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
						displayName: 'Attribute Type',
						name: 'attributeType',
						type: 'options',
						default: 'standard',
						options: [
							{
								name: 'Standard Attribute',
								value: 'standard',
							},
							{
								name: 'Custom Attribute',
								value: 'custom',
							},
						],
					},
					{
						displayName: 'Standard Attribute',
						name: 'standardName',
						type: 'options',
						default: 'address',
						options: [
							{ name: 'Address', value: 'address' },
							{ name: 'Birthdate', value: 'birthdate' },
							{ name: 'Email', value: 'email' },
							{ name: 'Family Name', value: 'family_name' },
							{ name: 'Gender', value: 'gender' },
							{ name: 'Given Name', value: 'given_name' },
							{ name: 'Locale', value: 'locale' },
							{ name: 'Middle Name', value: 'middle_name' },
							{ name: 'Name', value: 'name' },
							{ name: 'Nickname', value: 'nickname' },
							{ name: 'Phone Number', value: 'phone_number' },
							{ name: 'Preferred Username', value: 'preferred_username' },
							{ name: 'Profile Picture', value: 'profilepicture' },
							{ name: 'Updated At', value: 'updated_at' },
							{ name: 'User Sub', value: 'sub' },
							{ name: 'Website', value: 'website' },
							{ name: 'Zone Info', value: 'zoneinfo' },
						],
						displayOptions: {
							show: {
								attributeType: ['standard'],
							},
						},
					},
					{
						displayName: 'Custom Attribute Name',
						name: 'customName',
						type: 'string',
						default: '',
						placeholder: 'custom:myAttribute',
						description: 'The name of the custom attribute (must start with "custom:")',
						displayOptions: {
							show: {
								attributeType: ['custom'],
							},
						},
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
	},
];

const addToGroupFields: INodeProperties[] = [
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
				type: 'body',
				property: 'GroupName',
			},
		},
		type: 'resourceLocator',
	},
];

const removeFromGroupFields: INodeProperties[] = [
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

export const userFields: INodeProperties[] = [
	...getAllFields,
	...createFields,
	...deleteFields,
	...getFields,
	...updateFields,
	...addToGroupFields,
	...removeFromGroupFields,
];
