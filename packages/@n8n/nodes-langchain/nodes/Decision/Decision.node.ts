import type { DecisionModel } from '@n8n/ai-utilities';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { buildDecisionRequest } from './buildRequest';
import { buildDecisionOutput } from './normalizeResponse';
import type { DecisionNodeOptions, QuestionParameter } from './types';

export class Decision implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Decision',
		name: 'decision',
		icon: 'fa:code-branch',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Evaluate a state with typed questions and get probabilistic decisions back',
		defaults: {
			name: 'Decision',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Chains', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.decision/',
					},
				],
			},
		},
		inputs: [
			{ displayName: '', type: NodeConnectionTypes.Main },
			{
				displayName: 'Decision Model',
				maxConnections: 1,
				type: NodeConnectionTypes.AiDecisionModel,
				required: true,
			},
		],
		outputs: [NodeConnectionTypes.Main],
		builderHint: {
			inputs: {
				ai_decisionModel: { required: true },
			},
			searchHint:
				'Asks a Decision Model one or more typed questions about a state and returns the answers under the question IDs, with probabilities and confidence. Use a Switch or If node after it to act on decisions.<id>.value.',
		},
		properties: [
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				required: true,
				default: '',
				description:
					'The information the model should evaluate. Use an expression to reference data from previous nodes. An expression that resolves to an object or array is sent as JSON.',
				typeOptions: {
					rows: 4,
				},
			},
			{
				displayName: 'Questions',
				name: 'questions',
				placeholder: 'Add Question',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				options: [
					{
						name: 'question',
						displayName: 'Question',
						values: [
							{
								displayName: 'Question ID',
								name: 'id',
								type: 'string',
								default: '',
								required: true,
								placeholder: 'e.g. department',
								description:
									'Becomes the key of this question’s result in the output, for example decisions.department. Must be unique.',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: 'choice',
								noDataExpression: true,
								options: [
									{
										name: 'Choice',
										value: 'choice',
										description: 'Select exactly one of the options you configure',
									},
									{
										name: 'Score',
										value: 'score',
										description: 'Rate the state against an ordered rubric you configure',
									},
									{
										name: 'Boolean Probability',
										value: 'booleanProbability',
										description:
											'Get how likely an assertion is to be true, not a definite yes or no',
									},
								],
							},
							{
								displayName: 'Instructions',
								name: 'instructions',
								type: 'string',
								default: '',
								required: true,
								placeholder: 'e.g. Which team should handle this request?',
								description: 'What the model should decide about the state',
								typeOptions: {
									rows: 2,
								},
							},
							{
								displayName: 'Options',
								name: 'options',
								placeholder: 'Add Option',
								type: 'fixedCollection',
								default: { option: [{ value: '', description: '' }] },
								description: 'The model selects exactly one of these options',
								displayOptions: {
									show: {
										type: ['choice'],
									},
								},
								typeOptions: {
									multipleValues: true,
									sortable: true,
								},
								options: [
									{
										name: 'option',
										displayName: 'Option',
										values: [
											{
												displayName: 'Value',
												name: 'value',
												type: 'string',
												default: '',
												required: true,
												placeholder: 'e.g. billing',
												description:
													'Returned as the answer value when the model selects this option',
											},
											{
												displayName: 'Description',
												name: 'description',
												type: 'string',
												default: '',
												description: 'Tells the model when this option applies',
											},
										],
									},
								],
							},
							{
								displayName: 'Rubric Levels',
								name: 'levels',
								placeholder: 'Add Level',
								type: 'fixedCollection',
								default: { level: [{ description: '' }, { description: '' }] },
								description:
									'Describe each level from lowest to highest. The model returns a weighted value across them, so a result can land between levels. At least two levels are needed.',
								displayOptions: {
									show: {
										type: ['score'],
									},
								},
								typeOptions: {
									multipleValues: true,
									sortable: true,
								},
								options: [
									{
										name: 'level',
										displayName: 'Level',
										values: [
											{
												displayName: 'Description',
												name: 'description',
												type: 'string',
												default: '',
												required: true,
												placeholder: 'e.g. Low impact',
											},
										],
									},
								],
							},
							{
								displayName: 'What “True” Means',
								name: 'trueDescription',
								type: 'string',
								default: '',
								description: 'Optional. Tells the model what a high probability means.',
								displayOptions: {
									show: {
										type: ['booleanProbability'],
									},
								},
							},
							{
								displayName: 'What “False” Means',
								name: 'falseDescription',
								type: 'string',
								default: '',
								description: 'Optional. Tells the model what a low probability means.',
								displayOptions: {
									show: {
										type: ['booleanProbability'],
									},
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Confidence Threshold',
						name: 'confidenceThreshold',
						type: 'number',
						default: 0,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 2 },
						description:
							'Adds meetsConfidenceThreshold to every answer that reports confidence. Nothing is routed or dropped. No threshold is right for every use case: pick one that matches what a wrong decision costs you.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const node = this.getNode();

		const model = (await this.getInputConnectionData(NodeConnectionTypes.AiDecisionModel, 0)) as
			| DecisionModel
			| undefined;

		if (!model || typeof model.decide !== 'function') {
			throw new NodeOperationError(node, 'The connected node is not a Decision Model', {
				description: 'Connect a Decision Model sub-node, such as TypeSafe Jev Decision Model.',
			});
		}

		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const state = this.getNodeParameter('state', itemIndex) as unknown;
				const questions = this.getNodeParameter(
					'questions.question',
					itemIndex,
					[],
				) as QuestionParameter[];
				const { confidenceThreshold } = this.getNodeParameter(
					'options',
					itemIndex,
					{},
				) as DecisionNodeOptions;

				const request = buildDecisionRequest(state, questions, node, itemIndex);
				const response = await model.decide(request);

				returnData.push({
					json: buildDecisionOutput(response, request, node, itemIndex, confidenceThreshold),
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				throw error;
			}
		}

		return [returnData];
	}
}
