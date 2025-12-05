import type { INodeProperties } from 'n8n-workflow';

export const extractionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['extraction'],
			},
		},
		options: [
			{
				name: 'Evaluate JavaScript',
				value: 'evaluate',
				description: 'Execute JavaScript in the browser and return the result',
				action: 'Evaluate JavaScript',
			},
			{
				name: 'Get Attribute',
				value: 'attribute',
				description: 'Get an attribute value from an element',
				action: 'Get attribute',
			},
			{
				name: 'Get HTML Content',
				value: 'content',
				description: 'Get the full HTML content of the page',
				action: 'Get HTML content',
			},
			{
				name: 'Get Text',
				value: 'text',
				description: 'Get the text content of an element or the entire page',
				action: 'Get text',
			},
			{
				name: 'Screenshot',
				value: 'screenshot',
				description: 'Take a screenshot of the page or an element',
				action: 'Take screenshot',
			},
		],
		default: 'screenshot',
	},
];

export const extractionFields: INodeProperties[] = [
	// Selector for text, attribute (optional for text)
	{
		displayName: 'Selector',
		name: 'selector',
		type: 'string',
		default: '',
		placeholder: '#content, .article-body, p.description',
		description: 'CSS selector to get text from. Leave empty to get all text from the page body.',
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['text'],
			},
		},
	},
	// Selector for attribute (required)
	{
		displayName: 'Selector',
		name: 'selector',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'a.link, img.photo, input#email',
		description: 'CSS selector to get attribute from',
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['attribute'],
			},
		},
	},
	// Attribute name
	{
		displayName: 'Attribute',
		name: 'attribute',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'href, src, value, data-ID',
		description: 'The name of the attribute to get',
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['attribute'],
			},
		},
	},
	// Screenshot selector (optional)
	{
		displayName: 'Selector',
		name: 'selector',
		type: 'string',
		default: '',
		placeholder: '#chart, .modal, table.data',
		description: 'CSS selector to screenshot. Leave empty for viewport/full page.',
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['screenshot'],
			},
		},
	},
	// Full page screenshot
	{
		displayName: 'Full Page',
		name: 'fullPage',
		type: 'boolean',
		default: false,
		description: 'Whether to capture the full scrollable page instead of just the viewport',
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['screenshot'],
			},
		},
	},
	// JavaScript for evaluate
	{
		displayName: 'JavaScript',
		name: 'script',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		required: true,
		default: '',
		placeholder: 'document.querySelectorAll("a").length',
		description: 'JavaScript code to execute in the browser context. The result will be returned.',
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['evaluate'],
			},
		},
	},
];
