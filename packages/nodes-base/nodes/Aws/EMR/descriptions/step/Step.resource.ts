import type { INodeProperties } from 'n8n-workflow';

export const stepOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['step'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add steps to a cluster',
				action: 'Add steps',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'ElasticMapReduce.AddJobFlowSteps',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							JobFlowId: '={{ $parameter["clusterId"] }}',
							Steps: '={{ $parameter["steps"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a step',
				action: 'Describe a step',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'ElasticMapReduce.DescribeStep',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ClusterId: '={{ $parameter["clusterId"] }}',
							StepId: '={{ $parameter["stepId"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List steps for a cluster',
				action: 'List steps',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'ElasticMapReduce.ListSteps',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ClusterId: '={{ $parameter["clusterId"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const stepFields: INodeProperties[] = [
	{
		displayName: 'Cluster ID',
		name: 'clusterId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the cluster',
	},
	{
		displayName: 'Step ID',
		name: 'stepId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['step'],
				operation: ['describe'],
			},
		},
		default: '',
		description: 'The ID of the step',
	},
	{
		displayName: 'Steps (JSON)',
		name: 'steps',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['step'],
				operation: ['add'],
			},
		},
		default: '[\n  {\n    "Name": "Spark Job",\n    "ActionOnFailure": "CONTINUE",\n    "HadoopJarStep": {\n      "Jar": "command-runner.jar",\n      "Args": [\n        "spark-submit",\n        "--class", "org.apache.spark.examples.SparkPi",\n        "/usr/lib/spark/examples/jars/spark-examples.jar",\n        "10"\n      ]\n    }\n  }\n]',
		description: 'Array of steps to add to the cluster',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['step'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Step States',
				name: 'StepStates',
				type: 'multiOptions',
				options: [
					{ name: 'Pending', value: 'PENDING' },
					{ name: 'Running', value: 'RUNNING' },
					{ name: 'Completed', value: 'COMPLETED' },
					{ name: 'Cancelled', value: 'CANCELLED' },
					{ name: 'Failed', value: 'FAILED' },
					{ name: 'Interrupted', value: 'INTERRUPTED' },
				],
				default: [],
				description: 'Filter by step states',
			},
		],
	},
];
