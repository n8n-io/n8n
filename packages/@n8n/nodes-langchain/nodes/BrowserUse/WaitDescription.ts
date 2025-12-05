import type { INodeProperties } from 'n8n-workflow';

export const waitOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['wait'],
			},
		},
		options: [
			{
				name: 'Wait for Navigation',
				value: 'waitForNavigation',
				description: 'Wait for a page navigation to complete',
				action: 'Wait for navigation',
			},
			{
				name: 'Wait for Selector',
				value: 'waitForSelector',
				description: 'Wait for an element to appear on the page',
				action: 'Wait for selector',
			},
			{
				name: 'Wait for Timeout',
				value: 'waitForTimeout',
				description: 'Wait for a specified amount of time',
				action: 'Wait for timeout',
			},
		],
		default: 'waitForSelector',
	},
];

export const waitFields: INodeProperties[] = [
	// Selector for waitForSelector
	{
		displayName: 'Selector',
		name: 'selector',
		type: 'string',
		required: true,
		default: '',
		placeholder: '#loading-complete, .results, [data-loaded="true"]',
		description: 'CSS selector to wait for',
		displayOptions: {
			show: {
				resource: ['wait'],
				operation: ['waitForSelector'],
			},
		},
	},
	// Wait Until for waitForNavigation
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
				resource: ['wait'],
				operation: ['waitForNavigation'],
			},
		},
	},
	// Timeout for waitForSelector and waitForNavigation
	{
		displayName: 'Timeout (Ms)',
		name: 'timeout',
		type: 'number',
		default: 30000,
		description: 'Maximum time to wait in milliseconds',
		displayOptions: {
			show: {
				resource: ['wait'],
				operation: ['waitForSelector', 'waitForNavigation'],
			},
		},
	},
	// Duration for waitForTimeout
	{
		displayName: 'Duration (Ms)',
		name: 'timeout',
		type: 'number',
		required: true,
		default: 1000,
		description: 'Time to wait in milliseconds',
		displayOptions: {
			show: {
				resource: ['wait'],
				operation: ['waitForTimeout'],
			},
		},
	},
];
