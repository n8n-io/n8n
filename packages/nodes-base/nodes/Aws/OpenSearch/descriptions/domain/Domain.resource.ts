import type { INodeProperties } from 'n8n-workflow';

export const domainOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['domain'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new domain',
				action: 'Create a domain',
				routing: {
					request: {
						method: 'POST',
						url: '/2021-01-01/opensearch/domain',
						body: {
							DomainName: '={{ $parameter["domainName"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a domain',
				action: 'Delete a domain',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/2021-01-01/opensearch/domain/{{ $parameter["domainName"] }}',
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a domain',
				action: 'Describe a domain',
				routing: {
					request: {
						method: 'GET',
						url: '=/2021-01-01/opensearch/domain/{{ $parameter["domainName"] }}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all domains',
				action: 'List domains',
				routing: {
					request: {
						method: 'GET',
						url: '/2021-01-01/domain',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update domain configuration',
				action: 'Update a domain',
				routing: {
					request: {
						method: 'POST',
						url: '=/2021-01-01/opensearch/domain/{{ $parameter["domainName"] }}/config',
					},
				},
			},
		],
		default: 'list',
	},
];

export const domainFields: INodeProperties[] = [
	{
		displayName: 'Domain Name',
		name: 'domainName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['domain'],
				operation: ['create', 'delete', 'describe', 'update'],
			},
		},
		default: '',
		description: 'The name of the OpenSearch domain',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['domain'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Engine Version',
				name: 'EngineVersion',
				type: 'options',
				options: [
					{ name: 'OpenSearch 2.11', value: 'OpenSearch_2.11' },
					{ name: 'OpenSearch 2.9', value: 'OpenSearch_2.9' },
					{ name: 'OpenSearch 2.7', value: 'OpenSearch_2.7' },
					{ name: 'OpenSearch 2.5', value: 'OpenSearch_2.5' },
					{ name: 'OpenSearch 1.3', value: 'OpenSearch_1.3' },
				],
				default: 'OpenSearch_2.11',
				description: 'The OpenSearch engine version',
			},
			{
				displayName: 'Cluster Config',
				name: 'ClusterConfig',
				type: 'string',
				default: '',
				description: 'Cluster configuration as JSON (e.g., {"InstanceType":"t3.small.search","InstanceCount":1})',
			},
			{
				displayName: 'EBS Options',
				name: 'EBSOptions',
				type: 'string',
				default: '',
				description: 'EBS options as JSON (e.g., {"EBSEnabled":true,"VolumeSize":10,"VolumeType":"gp3"})',
			},
			{
				displayName: 'Access Policies',
				name: 'AccessPolicies',
				type: 'string',
				default: '',
				description: 'Access policies as JSON string',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['domain'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Cluster Config',
				name: 'ClusterConfig',
				type: 'string',
				default: '',
				description: 'Cluster configuration as JSON',
			},
			{
				displayName: 'EBS Options',
				name: 'EBSOptions',
				type: 'string',
				default: '',
				description: 'EBS options as JSON',
			},
			{
				displayName: 'Access Policies',
				name: 'AccessPolicies',
				type: 'string',
				default: '',
				description: 'Access policies as JSON string',
			},
		],
	},
];
