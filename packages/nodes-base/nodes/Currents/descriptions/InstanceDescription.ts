import type { INodeProperties } from 'n8n-workflow';

export const instanceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['instance'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a spec file execution instance with full test results',
				routing: {
					request: {
						method: 'GET',
						url: '=/instances/{{$parameter["instanceId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
						],
					},
				},
				action: 'Get an instance',
			},
		],
		default: 'get',
	},
];

export const instanceFields: INodeProperties[] = [
	{
		displayName: 'Instance ID',
		name: 'instanceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['instance'],
				operation: ['get'],
			},
		},
		description: 'The ID of the spec file execution instance',
	},
];
