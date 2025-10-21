import type { INodeProperties } from 'n8n-workflow';

export const webAclOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['webAcl'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a Web ACL',
				action: 'Create a web ACL',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSWAF_20190729.CreateWebACL',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Name: '={{ $parameter["name"] }}',
							Scope: '={{ $parameter["scope"] }}',
							DefaultAction: '={{ $parameter["defaultAction"] }}',
							VisibilityConfig: '={{ $parameter["visibilityConfig"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a Web ACL',
				action: 'Delete a web ACL',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSWAF_20190729.DeleteWebACL',
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
				description: 'Get details about a Web ACL',
				action: 'Get a web ACL',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSWAF_20190729.GetWebACL',
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
				description: 'List all Web ACLs',
				action: 'List web ACLs',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSWAF_20190729.ListWebACLs',
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
				description: 'Update a Web ACL',
				action: 'Update a web ACL',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSWAF_20190729.UpdateWebACL',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Name: '={{ $parameter["name"] }}',
							Scope: '={{ $parameter["scope"] }}',
							Id: '={{ $parameter["id"] }}',
							DefaultAction: '={{ $parameter["defaultAction"] }}',
							VisibilityConfig: '={{ $parameter["visibilityConfig"] }}',
							LockToken: '={{ $parameter["lockToken"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const webAclFields: INodeProperties[] = [
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
				description: 'For CloudFront distributions',
			},
			{
				name: 'Regional',
				value: 'REGIONAL',
				description: 'For regional resources like ALB, API Gateway',
			},
		],
		default: 'REGIONAL',
		description: 'The scope of the Web ACL',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['webAcl'],
				operation: ['create', 'delete', 'get', 'update'],
			},
		},
		default: '',
		description: 'The name of the Web ACL',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['webAcl'],
				operation: ['delete', 'get', 'update'],
			},
		},
		default: '',
		description: 'The unique identifier for the Web ACL',
	},
	{
		displayName: 'Lock Token',
		name: 'lockToken',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['webAcl'],
				operation: ['delete', 'update'],
			},
		},
		default: '',
		description: 'Lock token returned from a previous operation',
	},
	// Create/Update fields
	{
		displayName: 'Default Action (JSON)',
		name: 'defaultAction',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['webAcl'],
				operation: ['create', 'update'],
			},
		},
		default: '{\n  "Allow": {}\n}',
		description: 'The action to perform if none of the rules match. Use {"Allow": {}} or {"Block": {}}',
	},
	{
		displayName: 'Visibility Config (JSON)',
		name: 'visibilityConfig',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['webAcl'],
				operation: ['create', 'update'],
			},
		},
		default: '{\n  "SampledRequestsEnabled": true,\n  "CloudWatchMetricsEnabled": true,\n  "MetricName": "my-web-acl"\n}',
		description: 'Visibility configuration for CloudWatch metrics',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['webAcl'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
				description: 'A description of the Web ACL',
			},
			{
				displayName: 'Rules (JSON)',
				name: 'Rules',
				type: 'json',
				default: '[]',
				description: 'The rules to associate with the Web ACL',
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
				resource: ['webAcl'],
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
