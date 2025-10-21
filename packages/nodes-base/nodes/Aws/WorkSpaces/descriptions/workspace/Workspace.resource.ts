import type { INodeProperties } from 'n8n-workflow';
import { handleWorkSpacesError } from '../../helpers/errorHandler';

export const workspaceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['workspace'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a workspace',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'WorkspacesService.CreateWorkspaces',
						},
					},
					output: {
						postReceive: [handleWorkSpacesError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a workspace',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'WorkspacesService.TerminateWorkspaces',
						},
					},
					output: {
						postReceive: [handleWorkSpacesError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe workspaces',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'WorkspacesService.DescribeWorkspaces',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Workspaces',
								},
							},
							handleWorkSpacesError,
						],
					},
				},
			},
			{
				name: 'Reboot',
				value: 'reboot',
				action: 'Reboot workspaces',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'WorkspacesService.RebootWorkspaces',
						},
					},
					output: {
						postReceive: [handleWorkSpacesError],
					},
				},
			},
		],
	},
];

export const workspaceFields: INodeProperties[] = [
	{
		displayName: 'Workspaces',
		name: 'workspaces',
		type: 'json',
		required: true,
		default: '[]',
		displayOptions: {
			show: {
				resource: ['workspace'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					Workspaces: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
	{
		displayName: 'Workspace IDs',
		name: 'workspaceIds',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['workspace'],
				operation: ['delete', 'describe', 'reboot'],
			},
		},
		routing: {
			request: {
				body: {
					WorkspaceIds: '={{ $value.split(",").map(s => s.trim()) }}',
				},
			},
		},
	},
];
