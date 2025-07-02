import type { INodeProperties } from 'n8n-workflow';

import { document, sheet } from '../../Google/Sheet/GoogleSheetsTrigger.node';
import { CORRECTNESS_PROMPT, CORRECTNESS_INPUT_PROMPT } from './CannedMetricPrompts.ee';

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

const expectedAnswerFields: INodeProperties[] = [
	{
		displayName: 'Expected answer',
		name: 'expectedAnswer',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['setMetrics'],
				metric: ['correctness', 'stringSimilarity', 'accuracy'],
			},
		},
	},
	{
		displayName: 'Actual answer',
		name: 'actualAnswer',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['setMetrics'],
				metric: ['correctness', 'stringSimilarity', 'accuracy'],
			},
		},
	},
];

function promptFieldForMetric(metric: string, prompt: string): INodeProperties[] {
	return [
		{
			displayName: 'Prompt',
			name: 'prompt',
			type: 'string',
			default: prompt,
			typeOptions: {
				rows: 4,
			},
			displayOptions: {
				show: {
					operation: ['setMetrics'],
					metric: [metric],
				},
			},
		},
	];
}

function optionsForMetric(metric: string, prompt: string[]): INodeProperties[] {
	return [
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			default: {},
			placeholder: 'Add Option',
			options: [
				{
					displayName: 'Input prompt',
					name: 'inputPrompt',
					type: 'string',
					default: prompt[0],
					typeOptions: {
						rows: 4,
					},
					hint: prompt[1],
				},
			],
			displayOptions: {
				show: {
					operation: ['setMetrics'],
					metric: [metric],
				},
			},
		},
	];
}

const toolsUsedFields: INodeProperties[] = [
	{
		displayName: 'Expected tools',
		name: 'expectedTools',
		type: 'fixedCollection',
		placeholder: 'Add tool to expect',
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				name: 'tools',
				displayName: 'Tools',
				values: [
					{
						displayName: 'Tool',
						name: 'tool',
						type: 'string',
						default: '',
						description: 'Tool to expect',
						required: true,
					},
				],
			},
		],
		default: '',
		displayOptions: {
			show: {
				operation: ['setMetrics'],
				metric: ['toolsUsed'],
			},
		},
	},
	{
		displayName: 'Intermediate steps',
		name: 'intermediateSteps',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['setMetrics'],
				metric: ['toolsUsed'],
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
		displayName: 'Metric',
		name: 'metric',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Correctness',
				value: 'correctness',
			},
			{
				name: 'Helpfulness',
				value: 'helpfulness',
			},
			{
				name: 'String similarity',
				value: 'stringSimilarity',
			},
			{
				name: 'Accuracy',
				value: 'accuracy',
			},
			{
				name: 'Tools used',
				value: 'toolsUsed',
			},
			{
				name: 'Custom metrics',
				value: 'customMetrics',
			},
		],
		default: 'correctness',
	},
	...expectedAnswerFields,
	...toolsUsedFields,
	...promptFieldForMetric('correctness', CORRECTNESS_PROMPT),
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
				metric: ['customMetrics'],
			},
		},
	},
	...optionsForMetric('correctness', CORRECTNESS_INPUT_PROMPT),
];
