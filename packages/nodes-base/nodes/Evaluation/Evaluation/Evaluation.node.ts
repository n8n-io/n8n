import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { setEvaluationProperties, setOutputProperties } from './Description.node';
import { authentication } from '../../Google/Sheet/v2/actions/versionDescription';
import { listSearch, loadOptions } from '../methods';
import { checkIfEvaluating, setEvaluation, setOutputs, setOutput } from '../utils/evaluationUtils';

export class Evaluation implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Evaluation',
		icon: 'fa:check-double',
		name: 'evaluation',
		group: ['transform'],
		version: 4.6,
		description: 'Runs an evaluation',
		eventTriggerDescription: '',
		maxNodes: 1,
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'Evaluation',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: `={{(${setOutputs})($parameter)}}`,
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['serviceAccount'],
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
					},
				},
			},
		],
		properties: [
			authentication,
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Set Output',
						value: 'setOutput',
					},
					{
						name: 'Set Evaluation',
						value: 'setEvaluation',
					},
					{
						name: 'Check If Evaluating',
						value: 'checkIfEvaluating',
					},
				],
				default: 'setOutput',
			},
			...setOutputProperties,
			...setEvaluationProperties,
		],
	};

	methods = { loadOptions, listSearch };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0);

		if (operation === 'setOutput') {
			return await setOutput.call(this);
		} else if (operation === 'setEvaluation') {
			return await setEvaluation.call(this);
		} else {
			// operation === 'checkIfEvaluating'
			return await checkIfEvaluating.call(this);
		}
	}
}
