import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { handleErrorPostReceive, presendTest } from '../GenericFunctions';

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
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.CreateGroup',
						},
						qs: {
							pageSize:
								'={{ $parameter["limit"] ? ($parameter["limit"] < 60 ? $parameter["limit"] : 60) : 60 }}', // The API allows maximum 60 results per page
						},
						// preSend: [
						//   async function (this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions) {
						//     // Call the function you created in GenericFunctions
						//     return await getUserIdForGroup.call(this, requestOptions);
						//   },
						// ],
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
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.DeleteGroup',
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
				action: 'Delete group',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve details of an existing group',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.GetGroup',
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
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups',
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
				action: 'Get many groups',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing group',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.UpdateGroup',
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
				action: 'Update group',
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
				resource: ['group'],
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
		displayName: 'Group Name',
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
		routing: {
			send: {
				property: 'GroupName',
				type: 'body',
				preSend: [presendTest], // ToDo: Remove this line before completing the pull request
				paginate: true,
			},
		},
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
				default: '',
				placeholder: 'e.g. /division_abc/engineering/',
				description: 'The path to the group, if it is not included, it defaults to a slash (/)',
				routing: {
					send: {
						property: 'Path',
						type: 'body',
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								const path = this.getNodeParameter('path', '/') as string;

								// Length validation
								if (path.length < 1 || path.length > 512) {
									throw new NodeOperationError(
										this.getNode(),
										'Path must be between 1 and 512 characters.',
									);
								}

								// Regex validation
								if (!/^\/$|^\/[\u0021-\u007E]+\/$/.test(path)) {
									throw new NodeOperationError(
										this.getNode(),
										'Path must begin and end with a forward slash and contain valid ASCII characters.',
									);
								}

								return requestOptions;
							},
						],
					},
				},
			},
		],
		placeholder: 'Add Option',
		type: 'collection',
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
				resource: ['group'],
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
		displayName: 'Group Name',
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
					searchListMethod: 'listGroups',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'id',
				type: 'string',
				hint: 'Enter the group name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The group name must follow the pattern "xxxxxx_xxxxxxxxxxx"',
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
				resource: ['group'],
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
		displayName: 'Group Name',
		name: 'GroupName',
		required: true,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The name of the group to retrieve',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['get'],
			},
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
		displayName: 'User Pool ID',
		name: 'userPoolId',
		required: true,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The user pool ID where the users are managed',
		displayOptions: { show: { resource: ['group'], operation: ['getAll'] } },
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
		displayOptions: {
			show: {
				resource: ['group'],
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
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Fields',
				name: 'select',
				default: [],
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
				description: 'The fields to add to the output',
				routing: {
					send: {
						property: '$select',
						type: 'query',
						value: '={{ $value?.join(",") }}',
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getGroupProperties',
				},
				type: 'multiOptions',
			},
		],
		placeholder: 'Add Option',
		type: 'collection',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		default: {},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Filter Query Parameter',
				name: 'filter',
				default: '',
				description:
					'<a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter">Query parameter</a> to filter results by',
				placeholder: "startswith(displayName, 'a')",
				routing: {
					send: {
						property: '$filter',
						type: 'query',
					},
				},
				type: 'string',
				validateType: 'string',
			},
		],
		placeholder: 'Add Filter',
		type: 'collection',
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
				resource: ['group'],
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
		displayName: 'Group Name',
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
	{
		displayName: 'New Name',
		name: 'name',
		default: '',
		placeholder: 'e.g. My New Group',
		description: 'The new name of the group',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['update'],
			},
		},
		routing: {
			send: {
				property: 'GroupName',
				type: 'body',
				// preSend: [
				// 	async function (
				// 		this: IExecuteSingleFunctions,
				// 		requestOptions: IHttpRequestOptions,
				// 	): Promise<IHttpRequestOptions> {
				// 		const GroupName = this.getNodeParameter('name') as string;
				// 		if (GroupName.length < 1 || GroupName.length > 128) {
				// 			throw new NodeOperationError(
				// 				this.getNode(),
				// 				'Group Name must be between 1 and 128 characters.',
				// 			);
				// 		}

				// 		// Regex validation
				// 		if (!/^[\w+=,.@-]+$/.test(GroupName)) {
				// 			throw new NodeOperationError(
				// 				this.getNode(),
				// 				'Group Name contains invalid characters. Allowed characters: [\\w+=,.@-].',
				// 			);
				// 		}

				// 		return requestOptions;
				// 	},
				// ],
			},
		},
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
				default: '',
				placeholder: 'e.g. /division_abc/engineering/',
				description: 'The path to the group, if it is not included, it defaults to a slash (/)',
				routing: {
					send: {
						property: 'Path',
						type: 'body',
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								const path = this.getNodeParameter('path', '/') as string;

								// Length validation
								if (path.length < 1 || path.length > 512) {
									throw new NodeOperationError(
										this.getNode(),
										'Path must be between 1 and 512 characters.',
									);
								}

								// Regex validation
								if (!/^\/$|^\/[\u0021-\u007E]+\/$/.test(path)) {
									throw new NodeOperationError(
										this.getNode(),
										'Path must begin and end with a forward slash and contain valid ASCII characters.',
									);
								}

								return requestOptions;
							},
						],
					},
				},
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
