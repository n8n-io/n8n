import type { INodeProperties } from 'n8n-workflow';

import { document, sheet } from '../../Google/Sheet/GoogleSheetsTrigger.node';

export const setOutputProperties: INodeProperties[] = [
	{
		...document,
		displayOptions: {
			show: {
				operation: ['setOutput'],
			},
		},
	},
	{
		...sheet,
		displayOptions: {
			show: {
				operation: ['setOutput'],
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
				operation: ['setOutput'],
			},
		},
	},
];

export const setEvaluationProperties: INodeProperties[] = [
	{
		displayName:
			"Define the score(s) for the evaluation. They will be displayed in the ‘evaluations’ tab, not the Google Sheet. <a href='https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.evaluationmetric/' target='_blank'>More Info</a>",
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['setEvaluation'],
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
				operation: ['setEvaluation'],
			},
		},
	},
];
