import type { DecisionModel } from '@n8n/ai-utilities';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { buildDecisionRequest } from './buildRequest';
import { buildDecisionOutput } from './normalizeResponse';
import { branchCount, buildRoutingPlan, resolveBranch } from './routing';
import type { DecisionNodeOptions, QuestionParameter } from './types';

/**
 * Gives the node one output for each option of its choice question, so it
 * classifies and routes in one step. This runs in the expression sandbox, so it
 * must stay self-contained. While the configuration is incomplete it falls back
 * to a single output, which keeps the connections while a user edits options.
 */
export const configuredOutputs = (parameters: INodeParameters) => {
	const single = [{ type: 'main', displayName: 'Decisions' }];

	if (parameters.outputMode !== 'branch') return single;

	const questions = ((parameters.questions as IDataObject)?.question as IDataObject[]) ?? [];
	const choices = questions.filter((question) => question.type === 'choice');
	if (choices.length !== 1) return single;

	const options = ((choices[0].options as IDataObject)?.option as IDataObject[]) ?? [];
	const outputs = options
		.map((option) => (typeof option.value === 'string' ? option.value.trim() : ''))
		.filter((value) => value !== '')
		.map((value) => ({ type: 'main', displayName: value }));

	if (outputs.length === 0) return single;

	const threshold = (parameters.options as IDataObject)?.confidenceThreshold;
	if (typeof threshold === 'number' && threshold > 0) {
		outputs.push({ type: 'main', displayName: 'Low Confidence' });
	}

	return outputs;
};

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
		outputs: `={{(${configuredOutputs})($parameter)}}`,
		builderHint: {
			inputs: {
				ai_decisionModel: { required: true },
			},
			searchHint:
				'Asks a Decision Model one or more typed questions about a state and returns the answers under the question IDs, with probabilities and confidence. With outputMode "single" (the default) the node has one output; branch on decisions.<id>.value with a Switch node. With outputMode "branch" the node has one output for each option of its single choice question, in the configured order, plus a last "Low Confidence" output when options.confidenceThreshold is above 0; connect each one with .output(index).to(). @example decision.output(0).to(billingTeam) and decision.output(1).to(technicalTeam)',
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
				displayName: 'Output',
				name: 'outputMode',
				type: 'options',
				default: 'single',
				noDataExpression: true,
				description: 'How the node returns the decisions',
				options: [
					{
						name: 'Single Output',
						value: 'single',
						description: 'Return every decision on one output. Branch later with a Switch node.',
					},
					{
						name: 'Branch by Choice',
						value: 'branch',
						description:
							'Add one output for each option of the choice question, and send the item to the option the model selected',
					},
				],
			},
			{
				displayName:
					'This needs exactly one Choice question to branch on. Every answer still appears in the item, so a Score or Boolean Probability question can ride along.',
				name: 'branchNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						outputMode: ['branch'],
					},
				},
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
							'Adds meetsConfidenceThreshold to every answer that reports confidence. With Branch by Choice, a value above 0 also adds a "Low Confidence" output and sends the items below the threshold there. No threshold is right for every use case: pick one that matches what a wrong decision costs you.',
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

		const outputMode = this.getNodeParameter('outputMode', 0, 'single') as 'single' | 'branch';

		// The outputs belong to the node, so the plan comes from the first item.
		const plan =
			outputMode === 'branch'
				? buildRoutingPlan(
						this.getNodeParameter('questions.question', 0, []) as QuestionParameter[],
						(this.getNodeParameter('options', 0, {}) as DecisionNodeOptions).confidenceThreshold,
						node,
					)
				: undefined;

		const returnData: INodeExecutionData[][] = Array.from(
			{ length: plan === undefined ? 1 : branchCount(plan) },
			() => [],
		);

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
				const json = buildDecisionOutput(response, request, node, itemIndex, confidenceThreshold);

				const branch =
					plan === undefined
						? 0
						: resolveBranch(plan, json.decisions as IDataObject, node, itemIndex);

				returnData[branch].push({ json, pairedItem: { item: itemIndex } });
			} catch (error) {
				if (this.continueOnFail()) {
					// Output 0 always exists, so a failed item never disappears.
					returnData[0].push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				throw error;
			}
		}

		return returnData;
	}
}
