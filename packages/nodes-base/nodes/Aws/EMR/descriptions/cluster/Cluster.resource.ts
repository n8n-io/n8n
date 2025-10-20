import type { INodeProperties } from 'n8n-workflow';

export const clusterOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an EMR cluster',
				action: 'Create a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'ElasticMapReduce.RunJobFlow',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Name: '={{ $parameter["name"] }}',
							ReleaseLabel: '={{ $parameter["releaseLabel"] }}',
							Instances: '={{ $parameter["instances"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a cluster',
				action: 'Describe a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'ElasticMapReduce.DescribeCluster',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ClusterId: '={{ $parameter["clusterId"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all clusters',
				action: 'List clusters',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'ElasticMapReduce.ListClusters',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					},
				},
			},
			{
				name: 'Terminate',
				value: 'terminate',
				description: 'Terminate a cluster',
				action: 'Terminate a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'ElasticMapReduce.TerminateJobFlows',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							JobFlowIds: '={{ [$parameter["clusterId"]] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const clusterFields: INodeProperties[] = [
	// Common fields
	{
		displayName: 'Cluster ID',
		name: 'clusterId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['describe', 'terminate'],
			},
		},
		default: '',
		description: 'The unique identifier for the cluster',
	},
	// Create fields
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The name of the cluster',
	},
	{
		displayName: 'Release Label',
		name: 'releaseLabel',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		options: [
			{ name: 'emr-6.15.0', value: 'emr-6.15.0' },
			{ name: 'emr-6.14.0', value: 'emr-6.14.0' },
			{ name: 'emr-6.13.0', value: 'emr-6.13.0' },
			{ name: 'emr-6.12.0', value: 'emr-6.12.0' },
			{ name: 'emr-5.36.0', value: 'emr-5.36.0' },
		],
		default: 'emr-6.15.0',
		description: 'The EMR release version',
	},
	{
		displayName: 'Instances (JSON)',
		name: 'instances',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '{\n  "InstanceGroups": [\n    {\n      "InstanceRole": "MASTER",\n      "InstanceType": "m5.xlarge",\n      "InstanceCount": 1\n    },\n    {\n      "InstanceRole": "CORE",\n      "InstanceType": "m5.xlarge",\n      "InstanceCount": 2\n    }\n  ],\n  "Ec2KeyName": "my-key",\n  "KeepJobFlowAliveWhenNoSteps": true\n}',
		description: 'Instance configuration for the cluster',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Applications (JSON)',
				name: 'Applications',
				type: 'json',
				default: '[{"Name": "Spark"}, {"Name": "Hadoop"}]',
				description: 'Applications to install on the cluster',
			},
			{
				displayName: 'Log URI',
				name: 'LogUri',
				type: 'string',
				default: '',
				description: 'S3 location for cluster logs',
			},
			{
				displayName: 'Service Role',
				name: 'ServiceRole',
				type: 'string',
				default: 'EMR_DefaultRole',
				description: 'IAM role for EMR service',
			},
			{
				displayName: 'Job Flow Role',
				name: 'JobFlowRole',
				type: 'string',
				default: 'EMR_EC2_DefaultRole',
				description: 'IAM role for EC2 instances',
			},
			{
				displayName: 'Visible To All Users',
				name: 'VisibleToAllUsers',
				type: 'boolean',
				default: true,
				description: 'Whether the cluster is visible to all IAM users',
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
				resource: ['cluster'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Cluster States',
				name: 'ClusterStates',
				type: 'multiOptions',
				options: [
					{ name: 'Starting', value: 'STARTING' },
					{ name: 'Bootstrapping', value: 'BOOTSTRAPPING' },
					{ name: 'Running', value: 'RUNNING' },
					{ name: 'Waiting', value: 'WAITING' },
					{ name: 'Terminating', value: 'TERMINATING' },
					{ name: 'Terminated', value: 'TERMINATED' },
					{ name: 'Terminated With Errors', value: 'TERMINATED_WITH_ERRORS' },
				],
				default: [],
				description: 'Filter by cluster states',
			},
		],
	},
];
