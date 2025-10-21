import type { INodeProperties } from 'n8n-workflow';

export const robotApplicationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['robotApplication'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a robot application',
				action: 'Create a robot application',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'robomaker.CreateRobotApplication',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a robot application',
				action: 'Delete a robot application',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'robomaker.DeleteRobotApplication',
						},
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get robot application details',
				action: 'Get a robot application',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'robomaker.DescribeRobotApplication',
						},
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List robot applications',
				action: 'Get many robot applications',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'robomaker.ListRobotApplications',
						},
					},
				},
			},
		],
		default: 'create',
	},
];

export const robotApplicationFields: INodeProperties[] = [
	{
		displayName: 'Application ARN',
		name: 'application',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['robotApplication'],
				operation: ['get', 'delete'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					application: '={{ $value }}',
				},
			},
		},
		description: 'The ARN of the robot application',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['robotApplication'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					name: '={{ $value }}',
				},
			},
		},
		description: 'The name of the robot application',
	},
	{
		displayName: 'Robot Software Suite',
		name: 'robotSoftwareSuite',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['robotApplication'],
				operation: ['create'],
			},
		},
		default: '{"name": "ROS", "version": "Melodic"}',
		routing: {
			request: {
				body: {
					robotSoftwareSuite: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'The robot software suite configuration',
	},
	{
		displayName: 'Sources',
		name: 'sources',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['robotApplication'],
				operation: ['create'],
			},
		},
		default: '[{"s3Bucket": "my-bucket", "s3Key": "robot-app.tar.gz", "architecture": "X86_64"}]',
		routing: {
			request: {
				body: {
					sources: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'The sources of the robot application',
	},
];
