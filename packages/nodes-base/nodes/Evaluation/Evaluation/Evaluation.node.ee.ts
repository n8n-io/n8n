/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
} from 'n8n-workflow';
import { metricRequiresModelConnection } from 'n8n-workflow'; // See packages/workflow/src/evaluation-helpers.ts

import {
	setCheckIfEvaluatingProperties,
	setInputsProperties,
	setMetricsProperties,
	setOutputProperties,
	sourcePicker,
} from './Description.node';
import { authentication } from '../../Google/Sheet/v2/actions/versionDescription';
import { listSearch, loadOptions, credentialTest } from '../methods';
import {
	checkIfEvaluating,
	setMetrics,
	getInputConnectionTypes,
	getOutputConnectionTypes,
	setOutputs,
	setInputs,
} from '../utils/evaluationUtils';

export class Evaluation implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Evaluation',
		icon: 'fa:check-double',
		name: 'evaluation',
		group: ['transform'],
		version: [4.6, 4.7, 4.8],
		description: 'Runs an evaluation',
		eventTriggerDescription: '',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'Evaluation',
			color: '#c3c9d5',
		},
		// Pass function explicitly since expression context doesn't allow imports in getInputConnectionTypes
		inputs: `={{(${getInputConnectionTypes})($parameter, ${metricRequiresModelConnection})}}`,
		outputs: `={{(${getOutputConnectionTypes})($parameter)}}`,
		codex: {
			alias: ['Test', 'Metrics', 'Evals', 'Set Output', 'Set Metrics'],
		},
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['serviceAccount'],
						operation: ['setOutputs'],
					},
				},
				testedBy: 'googleApiCredentialTest',
			},
			{
				name: 'googleSheetsOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
						operation: ['setOutputs'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Set Inputs',
						value: 'setInputs',
					},
					{
						name: 'Set Outputs',
						value: 'setOutputs',
					},
					{
						name: 'Set Metrics',
						value: 'setMetrics',
					},
					{
						name: 'Check If Evaluating',
						value: 'checkIfEvaluating',
					},
				],
				default: 'setOutputs',
			},
			{
				...sourcePicker,
				default: 'dataTable',
				displayOptions: {
					show: { '@version': [{ _cnd: { gte: 4.8 } }], operation: ['setOutputs'] },
				},
			},
			{
				...sourcePicker,
				default: 'googleSheets',
				displayOptions: {
					show: { '@version': [{ _cnd: { lte: 4.7 } }], operation: ['setOutputs'] },
				},
			},
			{
				...authentication,
				displayOptions: {
					hide: {
						source: ['dataTable'],
					},
				},
			},
			...setInputsProperties,
			...setOutputProperties,
			...setMetricsProperties,
			...setCheckIfEvaluatingProperties,
		],
	};

	methods = { loadOptions, listSearch, credentialTest };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0);

		if (operation === 'setOutputs') {
			return await setOutputs.call(this);
		} else if (operation === 'setInputs') {
			return setInputs.call(this);
		} else if (operation === 'setMetrics') {
			return await setMetrics.call(this);
		} else if (operation === 'checkIfEvaluating') {
			return await checkIfEvaluating.call(this);
		}

		throw new Error('Unsupported Operation');
	}
}
