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
			name: 'Get',
			value: 'getJob',
			description: 'Get the definition of a job: its name, tasks, clusters and schedule',
			action: 'Get a job',
		},
		{
			name: 'Get Run Output',
			value: 'getRunOutput',
			description: 'Get what the tasks of a job run produced',
			action: 'Get run output',
		},
		{
			name: 'Run',
			value: 'run',
			description: 'Start a run of an existing job',
			action: 'Run a job',
		},
	],
	default: 'run',
};
