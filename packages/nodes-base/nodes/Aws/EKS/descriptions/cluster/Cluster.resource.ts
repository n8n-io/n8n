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
				resource: ['cluster'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an EKS cluster',
				action: 'Create an EKS cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/clusters',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							name: '={{ $parameter["clusterName"] }}',
							version: '={{ $parameter["version"] }}',
							roleArn: '={{ $parameter["roleArn"] }}',
							resourcesVpcConfig: '={{ $parameter["resourcesVpcConfig"] }}',
							logging: '={{ $parameter["logging"] }}',
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
				description: 'Delete an EKS cluster',
				action: 'Delete an EKS cluster',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/clusters/{{ $parameter["clusterName"] }}',
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
				description: 'Describe an EKS cluster',
				action: 'Describe an EKS cluster',
				routing: {
					request: {
						method: 'GET',
						url: '=/clusters/{{ $parameter["clusterName"] }}',
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
				description: 'List EKS clusters',
				action: 'List EKS clusters',
				routing: {
					request: {
						method: 'GET',
						url: '/clusters',
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
				description: 'Update cluster configuration',
				action: 'Update cluster configuration',
				routing: {
					request: {
						method: 'POST',
						url: '=/clusters/{{ $parameter["clusterName"] }}/update-config',
						body: {
							resourcesVpcConfig: '={{ $parameter["resourcesVpcConfig"] }}',
							logging: '={{ $parameter["logging"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Update Version',
				value: 'updateVersion',
				description: 'Update Kubernetes version',
				action: 'Update Kubernetes version',
				routing: {
					request: {
						method: 'POST',
						url: '=/clusters/{{ $parameter["clusterName"] }}/updates',
						body: {
							version: '={{ $parameter["version"] }}',
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
		displayName: 'Cluster Name',
		name: 'clusterName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
			},
		},
		default: '',
		description: 'Name of the EKS cluster',
	},
	// Create operation fields
	{
		displayName: 'Version',
		name: 'version',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create', 'updateVersion'],
			},
		},
		default: '1.28',
		description: 'Kubernetes version (e.g., 1.28, 1.27)',
	},
	{
		displayName: 'Role ARN',
		name: 'roleArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'IAM role ARN for the cluster',
	},
	{
		displayName: 'VPC Config',
		name: 'resourcesVpcConfig',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create', 'updateConfig'],
			},
		},
		default: '{"subnetIds": [], "securityGroupIds": [], "endpointPublicAccess": true, "endpointPrivateAccess": false}',
		description: 'VPC configuration for the cluster',
	},
	{
		displayName: 'Logging',
		name: 'logging',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create', 'updateConfig'],
			},
		},
		default: '{"clusterLogging": [{"types": ["api", "audit", "authenticator", "controllerManager", "scheduler"], "enabled": true}]}',
		description: 'Cluster logging configuration',
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
		description: 'Key-value pairs for tagging',
	},
	// List operation fields
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['list'],
			},
		},
		default: 100,
		description: 'Maximum number of results to return (1-100)',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];
