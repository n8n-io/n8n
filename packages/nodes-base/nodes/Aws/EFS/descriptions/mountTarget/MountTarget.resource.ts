import type { INodeProperties } from 'n8n-workflow';

export const mountTargetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['mountTarget'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a mount target',
				action: 'Create a mount target',
				routing: {
					request: {
						method: 'POST',
						url: '/2015-02-01/mount-targets',
						body: {
							FileSystemId: '={{ $parameter["fileSystemId"] }}',
							SubnetId: '={{ $parameter["subnetId"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a mount target',
				action: 'Delete a mount target',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/2015-02-01/mount-targets/{{ $parameter["mountTargetId"] }}',
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about mount targets',
				action: 'Describe mount targets',
				routing: {
					request: {
						method: 'GET',
						url: '/2015-02-01/mount-targets',
					},
				},
			},
		],
		default: 'describe',
	},
];

export const mountTargetFields: INodeProperties[] = [
	{
		displayName: 'File System ID',
		name: 'fileSystemId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['mountTarget'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The ID of the file system',
	},
	{
		displayName: 'Subnet ID',
		name: 'subnetId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['mountTarget'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The ID of the subnet to create the mount target in',
	},
	{
		displayName: 'Mount Target ID',
		name: 'mountTargetId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['mountTarget'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'The ID of the mount target',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['mountTarget'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'IP Address',
				name: 'IpAddress',
				type: 'string',
				default: '',
				description: 'Valid IPv4 address within the subnet',
			},
			{
				displayName: 'Security Groups',
				name: 'SecurityGroups',
				type: 'string',
				default: '',
				description: 'Comma-separated list of security group IDs',
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
				resource: ['mountTarget'],
				operation: ['describe'],
			},
		},
		options: [
			{
				displayName: 'File System ID',
				name: 'FileSystemId',
				type: 'string',
				default: '',
				description: 'Filter by file system ID',
			},
			{
				displayName: 'Mount Target ID',
				name: 'MountTargetId',
				type: 'string',
				default: '',
				description: 'Filter by mount target ID',
			},
			{
				displayName: 'Max Items',
				name: 'MaxItems',
				type: 'number',
				default: 100,
				description: 'Maximum number of mount targets to return',
			},
		],
	},
];
