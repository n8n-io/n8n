import type { INodeProperties } from 'n8n-workflow';

import {
	CORRECTNESS_PROMPT,
	CORRECTNESS_INPUT_PROMPT,
	HELPFULNESS_PROMPT,
	HELPFULNESS_INPUT_PROMPT,
} from './CannedMetricPrompts.ee';
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

const correctnessFields: INodeProperties[] = [
	{
		displayName: 'Expected Answer',
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
		displayName: 'Actual Answer',
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

const helpfulnessFields: INodeProperties[] = [
	{
		displayName: 'User Query',
		name: 'userQuery',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['setMetrics'],
				metric: ['helpfulness'],
			},
		},
	},
	{
		displayName: 'Response',
		name: 'actualAnswer',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['setMetrics'],
				metric: ['helpfulness'],
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
				// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
				{
					displayName: 'Input Prompt',
					name: 'inputPrompt',
					type: 'string',
					default: prompt[0] ?? '',
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
		displayName: 'Expected Tools',
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
		default: {},
		displayOptions: {
			show: {
				operation: ['setMetrics'],
				metric: ['toolsUsed'],
			},
		},
	},
	{
		displayName: 'Intermediate Steps',
		name: 'intermediateSteps',
		type: 'string',
		default: '',
		hint: "Enable returning intermediate steps in your agent node's options, then map them in here",
		displayOptions: {
			show: {
				operation: ['setMetrics'],
				metric: ['toolsUsed'],
			},
		},
	},
];

const namesForMetrics = [
	['accuracy', 'Accuracy'],
	['stringSimilarity', 'String similarity'],
	['helpfulness', 'Helpfulness'],
	['correctness', 'Correctness'],
].map(([metric, name]) => {
	return {
		displayName: 'Metric Name',
		name: 'metricName',
		type: 'string',
		default: name,
		displayOptions: {
			show: {
				operation: ['setMetrics'],
				metric: [metric],
			},
		},
	};
});

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
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
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
				name: 'String Similarity',
				value: 'stringSimilarity',
			},
			{
				name: 'Accuracy',
				value: 'accuracy',
			},
			{
				name: 'Tools Used',
				value: 'toolsUsed',
			},
			{
				name: 'Custom Metrics',
				value: 'customMetrics',
			},
		],
		default: 'correctness',
		displayOptions: {
			show: {
				operation: ['setMetrics'],
			},
		},
	},
	...namesForMetrics,
	...correctnessFields,
	...helpfulnessFields,
	...toolsUsedFields,
	...promptFieldForMetric('correctness', CORRECTNESS_PROMPT),
	...promptFieldForMetric('helpfulness', HELPFULNESS_PROMPT),
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
	...optionsForMetric('helpfulness', HELPFULNESS_INPUT_PROMPT),
];
