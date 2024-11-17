import type { INodeProperties } from 'n8n-workflow';

import { handlePagination, presendFilter, presendTest } from '../GenericFunctions';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		displayOptions: { show: { resource: ['user'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'List the existing users',
				routing: {
					send: {
						preSend: [presendTest], // ToDo: Remove this line before completing the pull request
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
				},
			},
		],
	},
];

export const userFields: INodeProperties[] = [
	{
		displayName: 'User Pool ID',
		name: 'userPoolId',
		required: true,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The user pool ID that the users are in', // ToDo: Improve description
		displayOptions: { show: { resource: ['user'], operation: ['getAll'] } },
		routing: { send: { type: 'body', property: 'UserPoolId' } },
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
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 60,
		},
		default: 60,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['user'], operation: ['getAll'], returnAll: [false] } },
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
