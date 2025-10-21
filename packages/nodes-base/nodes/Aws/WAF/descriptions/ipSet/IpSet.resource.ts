import type { INodeProperties } from 'n8n-workflow';

export const ipSetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['ipSet'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an IP set',
				action: 'Create an IP set',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSWAF_20190729.CreateIPSet',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Name: '={{ $parameter["name"] }}',
							Scope: '={{ $parameter["scope"] }}',
							IPAddressVersion: '={{ $parameter["ipAddressVersion"] }}',
							Addresses: '={{ $parameter["addresses"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an IP set',
				action: 'Delete an IP set',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSWAF_20190729.DeleteIPSet',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Name: '={{ $parameter["name"] }}',
							Scope: '={{ $parameter["scope"] }}',
							Id: '={{ $parameter["id"] }}',
							LockToken: '={{ $parameter["lockToken"] }}',
						},
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about an IP set',
				action: 'Get an IP set',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSWAF_20190729.GetIPSet',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Name: '={{ $parameter["name"] }}',
							Scope: '={{ $parameter["scope"] }}',
							Id: '={{ $parameter["id"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all IP sets',
				action: 'List IP sets',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSWAF_20190729.ListIPSets',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Scope: '={{ $parameter["scope"] }}',
						},
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an IP set',
				action: 'Update an IP set',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSWAF_20190729.UpdateIPSet',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Name: '={{ $parameter["name"] }}',
							Scope: '={{ $parameter["scope"] }}',
							Id: '={{ $parameter["id"] }}',
							Addresses: '={{ $parameter["addresses"] }}',
							LockToken: '={{ $parameter["lockToken"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const ipSetFields: INodeProperties[] = [
	// Common fields
	{
		displayName: 'Scope',
		name: 'scope',
		type: 'options',
		required: true,
		options: [
			{
				name: 'CloudFront',
				value: 'CLOUDFRONT',
			},
			{
				name: 'Regional',
				value: 'REGIONAL',
			},
		],
		default: 'REGIONAL',
		description: 'The scope of the IP set',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['ipSet'],
				operation: ['create', 'delete', 'get', 'update'],
			},
		},
		default: '',
		description: 'The name of the IP set',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['ipSet'],
				operation: ['delete', 'get', 'update'],
			},
		},
		default: '',
		description: 'The unique identifier for the IP set',
	},
	{
		displayName: 'Lock Token',
		name: 'lockToken',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['ipSet'],
				operation: ['delete', 'update'],
			},
		},
		default: '',
		description: 'Lock token returned from a previous operation',
	},
	// Create/Update fields
	{
		displayName: 'IP Address Version',
		name: 'ipAddressVersion',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['ipSet'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'IPv4',
				value: 'IPV4',
			},
			{
				name: 'IPv6',
				value: 'IPV6',
			},
		],
		default: 'IPV4',
		description: 'The IP address version to use',
	},
	{
		displayName: 'Addresses (JSON)',
		name: 'addresses',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['ipSet'],
				operation: ['create', 'update'],
			},
		},
		default: '["192.0.2.0/24", "198.51.100.0/24"]',
		description: 'Array of IP addresses or CIDR ranges',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['ipSet'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
				description: 'A description of the IP set',
			},
		],
	},
	// List fields
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['ipSet'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'Limit',
				type: 'number',
				default: 100,
				description: 'Maximum number of results to return',
			},
			{
				displayName: 'Next Marker',
				name: 'NextMarker',
				type: 'string',
				default: '',
				description: 'Marker for pagination',
			},
		],
	},
];
