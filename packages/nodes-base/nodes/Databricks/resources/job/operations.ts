import type { INodeProperties } from 'n8n-workflow';

export const jobOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['job'],
		},
	},
	options: [
		{
			name: 'Run',
			value: 'run',
			description: 'Start a run of an existing job',
			action: 'Run a job',
		},
	],
	default: 'run',
};
