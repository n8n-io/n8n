import type { INodeProperties } from 'n8n-workflow';

import { TLPs } from './AnalyzerInterface';

export const analyzersOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		description: 'Choose an operation',
		displayOptions: {
			show: {
				resource: ['analyzer'],
			},
		},
		default: 'execute',
		options: [
			{
				name: 'Execute',
				value: 'execute',
				description: 'Execute Analyzer',
				action: 'Execute an analyzer',
			},
		],
	},
];

export const analyzerFields: INodeProperties[] = [
	{
		displayName: 'Analyzer Type Name or ID',
		name: 'analyzer',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'loadActiveAnalyzers',
		},
		displayOptions: {
			show: {
				resource: ['analyzer'],
				operation: ['execute'],
			},
		},
		description:
			'Choose the analyzer. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		default: '',
	},
	{
		displayName: 'Observable Type Name or ID',
		name: 'observableType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['analyzer'],
				operation: ['execute'],
			},
			hide: {
				analyzer: [''],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'loadObservableOptions',
			loadOptionsDependsOn: ['analyzer'],
		},
		default: '',
		description:
			'Choose the observable type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// Observable type != file
	{
		displayName: 'Observable Value',
		name: 'observableValue',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['analyzer'],
				operation: ['execute'],
			},
			hide: {
				observableType: ['file'],
				analyzer: [''],
			},
		},
		default: '',
		description: 'Enter the observable value',
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				observableType: ['file'],
				resource: ['analyzer'],
				operation: ['execute'],
			},
		},
		hint: 'The name of the output binary field to put the file in',
	},
	{
		displayName: 'TLP',
		name: 'tlp',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['analyzer'],
				operation: ['execute'],
			},
			hide: {
				observableType: [''],
				analyzer: [''],
			},
		},
		options: [
			{
				name: 'White',
				value: TLPs.white,
			},
			{
				name: 'Green',
				value: TLPs.green,
			},
			{
				name: 'Amber',
				value: TLPs.amber,
			},
			{
				name: 'Red',
				value: TLPs.red,
			},
		],
		default: 2,
		description: 'The TLP of the analyzed observable',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['analyzer'],
				operation: ['execute'],
			},
		},
		options: [
			{
				displayName: 'Force',
				name: 'force',
				type: 'boolean',
				default: false,
				description: 'Whether to force bypassing the cache',
			},
			{
				displayName: 'Timeout (Seconds)',
				name: 'timeout',
				type: 'number',
				default: 3,
				description:
					'Timeout to wait for the report in case it is not available at the time the query was made',
			},
		],
	},
];
