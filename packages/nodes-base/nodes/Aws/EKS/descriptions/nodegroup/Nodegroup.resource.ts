import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		displayOptions: {
			show: {
				resource: ['nodegroup'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a node group',
				action: 'Create a node group',
				routing: {
					request: {
						method: 'POST',
						url: '=/clusters/{{ $parameter["clusterName"] }}/node-groups',
						body: {
							nodegroupName: '={{ $parameter["nodegroupName"] }}',
							subnets: '={{ $parameter["subnets"] }}',
							nodeRole: '={{ $parameter["nodeRole"] }}',
							scalingConfig: '={{ $parameter["scalingConfig"] }}',
							instanceTypes: '={{ $parameter["instanceTypes"] }}',
							diskSize: '={{ $parameter["diskSize"] }}',
							amiType: '={{ $parameter["amiType"] }}',
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
				description: 'Delete a node group',
				action: 'Delete a node group',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/clusters/{{ $parameter["clusterName"] }}/node-groups/{{ $parameter["nodegroupName"] }}',
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
				description: 'Describe a node group',
				action: 'Describe a node group',
				routing: {
					request: {
						method: 'GET',
						url: '=/clusters/{{ $parameter["clusterName"] }}/node-groups/{{ $parameter["nodegroupName"] }}',
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
				description: 'List node groups',
				action: 'List node groups',
				routing: {
					request: {
						method: 'GET',
						url: '=/clusters/{{ $parameter["clusterName"] }}/node-groups',
						qs: {
							maxResults: '={{ $parameter["maxResults"] }}',
							nextToken: '={{ $parameter["nextToken"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Update Config',
				value: 'updateConfig',
				description: 'Update node group configuration',
				action: 'Update node group configuration',
				routing: {
					request: {
						method: 'POST',
						url: '=/clusters/{{ $parameter["clusterName"] }}/node-groups/{{ $parameter["nodegroupName"] }}/update-config',
						body: {
							scalingConfig: '={{ $parameter["scalingConfig"] }}',
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
	// Common fields
	{
		displayName: 'Cluster Name',
		name: 'clusterName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['nodegroup'],
			},
		},
		default: '',
		description: 'Name of the EKS cluster',
	},
	{
		displayName: 'Node Group Name',
		name: 'nodegroupName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['nodegroup'],
			},
		},
		default: '',
		description: 'Name of the node group',
	},
	// Create operation fields
	{
		displayName: 'Subnets',
		name: 'subnets',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['nodegroup'],
				operation: ['create'],
			},
		},
		default: '[]',
		description: 'Array of subnet IDs for node group',
	},
	{
		displayName: 'Node Role ARN',
		name: 'nodeRole',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['nodegroup'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'IAM role ARN for the nodes',
	},
	{
		displayName: 'Scaling Config',
		name: 'scalingConfig',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['nodegroup'],
				operation: ['create', 'updateConfig'],
			},
		},
		default: '{"minSize": 1, "maxSize": 3, "desiredSize": 2}',
		description: 'Scaling configuration for the node group',
	},
	{
		displayName: 'Instance Types',
		name: 'instanceTypes',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['nodegroup'],
				operation: ['create'],
			},
		},
		default: '["t3.medium"]',
		description: 'Array of EC2 instance types',
	},
	{
		displayName: 'Disk Size',
		name: 'diskSize',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['nodegroup'],
				operation: ['create'],
			},
		},
		default: 20,
		description: 'Disk size in GB for nodes',
	},
	{
		displayName: 'AMI Type',
		name: 'amiType',
		type: 'options',
		options: [
			{ name: 'AL2_x86_64', value: 'AL2_x86_64' },
			{ name: 'AL2_x86_64_GPU', value: 'AL2_x86_64_GPU' },
			{ name: 'AL2_ARM_64', value: 'AL2_ARM_64' },
			{ name: 'BOTTLEROCKET_ARM_64', value: 'BOTTLEROCKET_ARM_64' },
			{ name: 'BOTTLEROCKET_x86_64', value: 'BOTTLEROCKET_x86_64' },
		],
		displayOptions: {
			show: {
				resource: ['nodegroup'],
				operation: ['create'],
			},
		},
		default: 'AL2_x86_64',
		description: 'AMI type for the nodes',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['nodegroup'],
				operation: ['create'],
			},
		},
		default: '{}',
		description: 'Key-value pairs for tagging',
	},
	// List operation fields
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['nodegroup'],
				operation: ['list'],
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
				resource: ['nodegroup'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];
