import type { INodeProperties } from 'n8n-workflow';

export const notebookInstanceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['notebookInstance'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a notebook instance',
				action: 'Create a notebook instance',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.CreateNotebookInstance',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							NotebookInstanceName: '={{ $parameter["notebookInstanceName"] }}',
							InstanceType: '={{ $parameter["instanceType"] }}',
							RoleArn: '={{ $parameter["roleArn"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a notebook instance',
				action: 'Delete a notebook instance',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.DeleteNotebookInstance',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							NotebookInstanceName: '={{ $parameter["notebookInstanceName"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a notebook instance',
				action: 'Describe a notebook instance',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.DescribeNotebookInstance',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							NotebookInstanceName: '={{ $parameter["notebookInstanceName"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all notebook instances',
				action: 'List notebook instances',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.ListNotebookInstances',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					},
				},
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Start a notebook instance',
				action: 'Start a notebook instance',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.StartNotebookInstance',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							NotebookInstanceName: '={{ $parameter["notebookInstanceName"] }}',
						},
					},
				},
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Stop a notebook instance',
				action: 'Stop a notebook instance',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.StopNotebookInstance',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							NotebookInstanceName: '={{ $parameter["notebookInstanceName"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const notebookInstanceFields: INodeProperties[] = [
	// Create fields
	{
		displayName: 'Notebook Instance Name',
		name: 'notebookInstanceName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['notebookInstance'],
				operation: ['create', 'delete', 'describe', 'start', 'stop'],
			},
		},
		default: '',
		description: 'The name of the notebook instance',
	},
	{
		displayName: 'Instance Type',
		name: 'instanceType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['notebookInstance'],
				operation: ['create'],
			},
		},
		options: [
			{ name: 'ml.t2.medium', value: 'ml.t2.medium' },
			{ name: 'ml.t2.large', value: 'ml.t2.large' },
			{ name: 'ml.t2.xlarge', value: 'ml.t2.xlarge' },
			{ name: 'ml.t3.medium', value: 'ml.t3.medium' },
			{ name: 'ml.t3.large', value: 'ml.t3.large' },
			{ name: 'ml.t3.xlarge', value: 'ml.t3.xlarge' },
			{ name: 'ml.m5.xlarge', value: 'ml.m5.xlarge' },
			{ name: 'ml.m5.2xlarge', value: 'ml.m5.2xlarge' },
			{ name: 'ml.p3.2xlarge', value: 'ml.p3.2xlarge' },
		],
		default: 'ml.t3.medium',
		description: 'The instance type for the notebook instance',
	},
	{
		displayName: 'Role ARN',
		name: 'roleArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['notebookInstance'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The IAM role ARN that SageMaker can assume',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['notebookInstance'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Volume Size in GB',
				name: 'VolumeSizeInGB',
				type: 'number',
				default: 5,
				description: 'Size of the ML storage volume in GB',
			},
			{
				displayName: 'Subnet ID',
				name: 'SubnetId',
				type: 'string',
				default: '',
				description: 'The VPC subnet ID',
			},
			{
				displayName: 'Security Group IDs',
				name: 'SecurityGroupIds',
				type: 'string',
				default: '',
				description: 'Comma-separated list of security group IDs',
			},
			{
				displayName: 'Direct Internet Access',
				name: 'DirectInternetAccess',
				type: 'options',
				options: [
					{ name: 'Enabled', value: 'Enabled' },
					{ name: 'Disabled', value: 'Disabled' },
				],
				default: 'Enabled',
				description: 'Whether the notebook instance has internet access',
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
				resource: ['notebookInstance'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Results',
				name: 'MaxResults',
				type: 'number',
				default: 10,
				description: 'Maximum number of results to return',
			},
			{
				displayName: 'Next Token',
				name: 'NextToken',
				type: 'string',
				default: '',
				description: 'Token for pagination',
			},
			{
				displayName: 'Status Equals',
				name: 'StatusEquals',
				type: 'options',
				options: [
					{ name: 'Pending', value: 'Pending' },
					{ name: 'InService', value: 'InService' },
					{ name: 'Stopping', value: 'Stopping' },
					{ name: 'Stopped', value: 'Stopped' },
					{ name: 'Failed', value: 'Failed' },
					{ name: 'Deleting', value: 'Deleting' },
				],
				default: '',
				description: 'Filter by status',
			},
		],
	},
];
