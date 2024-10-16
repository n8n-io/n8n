import type { INodeProperties } from 'n8n-workflow';

export const resources: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	default: 'activity',
	placeholder: 'Resourcee',
	options: [
		{
			name: 'Activity',
			value: 'activity',
		},
		{
			name: 'Automation',
			value: 'automation',
		},
		{
			name: 'Member',
			value: 'member',
		},
		{
			name: 'Note',
			value: 'note',
		},
		{
			name: 'Organization',
			value: 'organization',
		},
		{
			name: 'Task',
			value: 'task',
		},
	],
};
