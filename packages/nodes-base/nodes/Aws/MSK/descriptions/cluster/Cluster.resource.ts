import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['cluster'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a Kafka cluster',
				action: 'Create a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/clusters',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							clusterName: '={{ $parameter["clusterName"] }}',
							kafkaVersion: '={{ $parameter["kafkaVersion"] }}',
							numberOfBrokerNodes: '={{ $parameter["numberOfBrokerNodes"] }}',
							brokerNodeGroupInfo: '={{ $parameter["brokerNodeGroupInfo"] }}',
							encryptionInfo: '={{ $parameter["encryptionInfo"] }}',
							clientAuthentication: '={{ $parameter["clientAuthentication"] }}',
							tags: '={{ $parameter["tags"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a Kafka cluster',
				action: 'Delete a cluster',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v1/clusters/{{ $parameter["clusterArn"] }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Describe a Kafka cluster',
				action: 'Describe a cluster',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/clusters/{{ $parameter["clusterArn"] }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get Bootstrap Brokers',
				value: 'getBootstrapBrokers',
				description: 'Get bootstrap broker connection string',
				action: 'Get bootstrap brokers',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/clusters/{{ $parameter["clusterArn"] }}/bootstrap-brokers',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List Kafka clusters',
				action: 'List clusters',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/clusters?maxResults={{ $parameter["maxResults"] }}&nextToken={{ $parameter["nextToken"] }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'List Nodes',
				value: 'listNodes',
				description: 'List nodes in a cluster',
				action: 'List nodes',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/clusters/{{ $parameter["clusterArn"] }}/nodes?maxResults={{ $parameter["maxResults"] }}&nextToken={{ $parameter["nextToken"] }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Update Broker Count',
				value: 'updateBrokerCount',
				description: 'Update the number of broker nodes',
				action: 'Update broker count',
				routing: {
					request: {
						method: 'PUT',
						url: '=/v1/clusters/{{ $parameter["clusterArn"] }}/nodes/count',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							currentVersion: '={{ $parameter["currentVersion"] }}',
							targetNumberOfBrokerNodes: '={{ $parameter["targetNumberOfBrokerNodes"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Update Broker Storage',
				value: 'updateBrokerStorage',
				description: 'Update broker storage capacity',
				action: 'Update broker storage',
				routing: {
					request: {
						method: 'PUT',
						url: '=/v1/clusters/{{ $parameter["clusterArn"] }}/nodes/storage',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							currentVersion: '={{ $parameter["currentVersion"] }}',
							targetBrokerEBSVolumeInfo: '={{ $parameter["targetBrokerEBSVolumeInfo"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Update Configuration',
				value: 'updateConfiguration',
				description: 'Update cluster configuration',
				action: 'Update configuration',
				routing: {
					request: {
						method: 'PUT',
						url: '=/v1/clusters/{{ $parameter["clusterArn"] }}/configuration',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							currentVersion: '={{ $parameter["currentVersion"] }}',
							configurationInfo: '={{ $parameter["configurationInfo"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
		],
	},
	// Common field
	{
		displayName: 'Cluster ARN',
		name: 'clusterArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['delete', 'describe', 'getBootstrapBrokers', 'listNodes', 'updateBrokerCount', 'updateBrokerStorage', 'updateConfiguration'],
			},
		},
		default: '',
		description: 'ARN of the MSK cluster',
	},
	// Create operation
	{
		displayName: 'Cluster Name',
		name: 'clusterName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Name of the Kafka cluster',
	},
	{
		displayName: 'Kafka Version',
		name: 'kafkaVersion',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '3.5.1',
		description: 'Apache Kafka version (e.g., 3.5.1, 3.4.0, 2.8.1)',
	},
	{
		displayName: 'Number Of Broker Nodes',
		name: 'numberOfBrokerNodes',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: 3,
		description: 'Number of broker nodes (must be multiple of AZs)',
	},
	{
		displayName: 'Broker Node Group Info',
		name: 'brokerNodeGroupInfo',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '{"instanceType": "kafka.m5.large", "clientSubnets": ["subnet-xxx", "subnet-yyy"], "securityGroups": ["sg-xxx"], "storageInfo": {"ebsStorageInfo": {"volumeSize": 100}}}',
		description: 'Broker node configuration (instance type, subnets, security groups, storage)',
	},
	{
		displayName: 'Encryption Info',
		name: 'encryptionInfo',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '{"encryptionInTransit": {"clientBroker": "TLS", "inCluster": true}}',
		description: 'Encryption configuration',
	},
	{
		displayName: 'Client Authentication',
		name: 'clientAuthentication',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '{}',
		description: 'Client authentication configuration (TLS, SASL)',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '{}',
		description: 'Tags as key-value pairs',
	},
	// List operation
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['list', 'listNodes'],
			},
		},
		default: 100,
		description: 'Maximum number of results to return',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['list', 'listNodes'],
			},
		},
		default: '',
		description: 'Pagination token',
	},
	// Update operations
	{
		displayName: 'Current Version',
		name: 'currentVersion',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['updateBrokerCount', 'updateBrokerStorage', 'updateConfiguration'],
			},
		},
		default: '',
		description: 'Current cluster version (from describe operation)',
	},
	{
		displayName: 'Target Number Of Broker Nodes',
		name: 'targetNumberOfBrokerNodes',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['updateBrokerCount'],
			},
		},
		default: 3,
		description: 'Target number of broker nodes',
	},
	{
		displayName: 'Target Broker EBS Volume Info',
		name: 'targetBrokerEBSVolumeInfo',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['updateBrokerStorage'],
			},
		},
		default: '[{"kafkaBrokerNodeId": "1", "volumeSizeGB": 200}]',
		description: 'Array of broker storage updates',
	},
	{
		displayName: 'Configuration Info',
		name: 'configurationInfo',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['updateConfiguration'],
			},
		},
		default: '{"arn": "arn:aws:kafka:region:account:configuration/name/id", "revision": 1}',
		description: 'Configuration ARN and revision',
	},
];
