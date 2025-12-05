import type { INodeProperties } from 'n8n-workflow';

export const interactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['interaction'],
			},
		},
		options: [
			{
				name: 'Click',
				value: 'click',
				description: 'Click an element on the page',
				action: 'Click element',
			},
			{
				name: 'Hover',
				value: 'hover',
				description: 'Hover over an element',
				action: 'Hover element',
			},
			{
				name: 'Press Key',
				value: 'press',
				description: 'Press a keyboard key',
				action: 'Press key',
			},
			{
				name: 'Scroll',
				value: 'scroll',
				description: 'Scroll the page',
				action: 'Scroll page',
			},
			{
				name: 'Select',
				value: 'select',
				description: 'Select option(s) from a dropdown',
				action: 'Select option',
			},
			{
				name: 'Type',
				value: 'type',
				description: 'Type text into an input element',
				action: 'Type text',
			},
		],
		default: 'click',
	},
];

export const interactionFields: INodeProperties[] = [
	// Selector for click, type, hover, select
	{
		displayName: 'Selector',
		name: 'selector',
		type: 'string',
		required: true,
		default: '',
		placeholder: '#my-button, .submit-btn, input[name="email"]',
		description: 'CSS selector or XPath to identify the element',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['click', 'type', 'hover', 'select'],
			},
		},
	},
	// Text for type
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		description: 'The text to type into the element',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['type'],
			},
		},
	},
	// Key for press
	{
		displayName: 'Key',
		name: 'key',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Enter, Tab, Escape, ArrowDown',
		description: 'The key to press (e.g., Enter, Tab, Escape, ArrowDown)',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['press'],
			},
		},
	},
	// Value for select
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		required: true,
		default: '',
		description:
			'The value to select. For multiple selections, separate values with commas (e.g., "option1,option2").',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['select'],
			},
		},
	},
	// Scroll direction
	{
		displayName: 'Scroll Direction',
		name: 'scrollDirection',
		type: 'options',
		options: [
			{ name: 'Down', value: 'down' },
			{ name: 'Up', value: 'up' },
			{ name: 'Left', value: 'left' },
			{ name: 'Right', value: 'right' },
		],
		default: 'down',
		description: 'The direction to scroll',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['scroll'],
			},
		},
	},
	// Scroll amount
	{
		displayName: 'Scroll Amount (Px)',
		name: 'scrollAmount',
		type: 'number',
		default: 300,
		description: 'The amount to scroll in pixels',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['scroll'],
			},
		},
	},
	// Timeout
	{
		displayName: 'Timeout (Ms)',
		name: 'timeout',
		type: 'number',
		default: 30000,
		description: 'Maximum time to wait for element in milliseconds',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['click', 'type', 'hover', 'select'],
			},
		},
	},
];
