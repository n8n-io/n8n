import type { INodeProperties } from 'n8n-workflow';

export const bashOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['bash'],
			},
		},
		options: [
			{
				name: 'Execute Command',
				value: 'execute',
				description: 'Execute a bash command',
				action: 'Execute bash command',
			},
			{
				name: 'Restart Session',
				value: 'restart',
				description: 'Restart the bash session',
				action: 'Restart bash session',
			},
		],
		default: 'execute',
	},
];

export const bashFields: INodeProperties[] = [
	{
		displayName: 'Command',
		name: 'command',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., ls -la',
		description: 'The bash command to execute',
		displayOptions: {
			show: {
				resource: ['bash'],
				operation: ['execute'],
			},
		},
	},
];
