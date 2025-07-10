import type { INodeProperties } from 'n8n-workflow';

import { document, sheet } from '../../Google/Sheet/GoogleSheetsTrigger.node';

export const setOutputProperties: INodeProperties[] = [
	{
		displayName: 'Credentials',
		name: 'credentials',
		type: 'credentials',
		default: '',
	},
	{
		...document,
		displayName: 'Document Containing Dataset',
		displayOptions: {
			show: {
				operation: ['setOutputs'],
			},
		},
	},
	{
		...sheet,
		displayName: 'Sheet Containing Dataset',
		displayOptions: {
			show: {
				operation: ['setOutputs'],
			},
		},
	},
	{
		displayName: 'Outputs',
		name: 'outputs',
		placeholder: 'Add Output',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Output',
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Filter',
				name: 'values',
				values: [
					{
						displayName: 'Name',
						name: 'outputName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'outputValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
		displayOptions: {
			show: {
				operation: ['setOutputs'],
			},
		},
	},
];

export const setCheckIfEvaluatingProperties: INodeProperties[] = [
	{
		displayName:
			'Routes to the ‘evaluation’ branch if the execution started from an evaluation trigger. Otherwise routes to the ‘normal’ branch.',
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['checkIfEvaluating'],
			},
		},
	},
];

export const setMetricsProperties: INodeProperties[] = [
	{
		displayName:
			"Calculate the score(s) for the evaluation, then map them into this node. They will be displayed in the ‘evaluations’ tab, not the Google Sheet. <a href='https://docs.n8n.io/advanced-ai/evaluations/metric-based-evaluations/#2-calculate-metrics' target='_blank'>View metric examples</a>",
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['setMetrics'],
			},
		},
	},
	{
		displayName: 'Metrics to Return',
		name: 'metrics',
		type: 'assignmentCollection',
		default: {
			assignments: [
				{
					name: '',
					value: '',
					type: 'number',
				},
			],
		},
		typeOptions: {
			assignment: {
				disableType: true,
				defaultType: 'number',
			},
		},
		displayOptions: {
			show: {
				operation: ['setMetrics'],
			},
		},
	},
];
