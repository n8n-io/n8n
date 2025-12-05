import type { INodeProperties } from 'n8n-workflow';

export const navigationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['navigation'],
			},
		},
		options: [
			{
				name: 'Go Back',
				value: 'goBack',
				description: 'Navigate back in browser history',
				action: 'Go back',
			},
			{
				name: 'Go Forward',
				value: 'goForward',
				description: 'Navigate forward in browser history',
				action: 'Go forward',
			},
			{
				name: 'Go to URL',
				value: 'goto',
				description: 'Navigate to a URL',
				action: 'Navigate to URL',
			},
			{
				name: 'Reload',
				value: 'reload',
				description: 'Reload the current page',
				action: 'Reload page',
			},
		],
		default: 'goto',
	},
];

export const navigationFields: INodeProperties[] = [
	// URL field for goto
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com',
		description: 'The URL to navigate to',
		displayOptions: {
			show: {
				resource: ['navigation'],
				operation: ['goto'],
			},
		},
	},
	// Wait Until option
	{
		displayName: 'Wait Until',
		name: 'waitUntil',
		type: 'options',
		options: [
			{
				name: 'Load',
				value: 'load',
				description: 'Wait until the load event is fired',
			},
			{
				name: 'DOM Content Loaded',
				value: 'domcontentloaded',
				description: 'Wait until DOMContentLoaded event is fired',
			},
			{
				name: 'Network Idle (0 Connections)',
				value: 'networkidle0',
				description: 'Wait until there are no more than 0 network connections for 500ms',
			},
			{
				name: 'Network Idle (2 Connections)',
				value: 'networkidle2',
				description: 'Wait until there are no more than 2 network connections for 500ms',
			},
		],
		default: 'load',
		description: 'When to consider navigation complete',
		displayOptions: {
			show: {
				resource: ['navigation'],
				operation: ['goto', 'goBack', 'goForward', 'reload'],
			},
		},
	},
	// Timeout
	{
		displayName: 'Timeout (Ms)',
		name: 'timeout',
		type: 'number',
		default: 30000,
		description: 'Maximum time to wait for navigation in milliseconds',
		displayOptions: {
			show: {
				resource: ['navigation'],
				operation: ['goto', 'goBack', 'goForward', 'reload'],
			},
		},
	},
];
