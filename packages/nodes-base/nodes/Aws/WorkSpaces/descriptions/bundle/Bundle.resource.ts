import type { INodeProperties } from 'n8n-workflow';
import { handleWorkSpacesError } from '../../helpers/errorHandler';

export const bundleOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['bundle'],
			},
		},
		options: [
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe bundles',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'WorkspacesService.DescribeWorkspaceBundles',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Bundles',
								},
							},
							handleWorkSpacesError,
						],
					},
				},
			},
		],
	},
];

export const bundleFields: INodeProperties[] = [
	{
		displayName: 'Bundle IDs',
		name: 'bundleIds',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['bundle'],
			},
		},
		routing: {
			request: {
				body: {
					BundleIds: '={{ $value ? $value.split(",").map(s => s.trim()) : undefined }}',
				},
			},
		},
	},
];
