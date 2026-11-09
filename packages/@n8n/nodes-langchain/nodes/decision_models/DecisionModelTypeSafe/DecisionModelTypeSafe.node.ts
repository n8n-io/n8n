import { supplyDecisionModel } from '@n8n/ai-utilities';
import type { DecisionModel, DecisionRequest, DecisionResponse } from '@n8n/ai-utilities';
import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { SYSTEM_ONE_PATH, typeSafeApiRequest } from './transport';
import type { TypeSafeSystemOneResponse } from './typesafe-mapping';
import { toDecisionResponse, toTypeSafeQuestions } from './typesafe-mapping';

const DEFAULT_MODEL = 'jev-latest';
const DEFAULT_TIMEOUT = 60000;
const DEFAULT_MAX_RETRIES = 2;

interface NodeOptions {
	timeout?: number;
	maxRetries?: number;
}

interface ModelOptions {
	modelId: string;
	timeout: number;
	maxRetries: number;
}

/** Adapts the TypeSafe System One endpoint to the generic Decision Model contract. */
export function createTypeSafeModel(
	ctx: ISupplyDataFunctions,
	{ modelId, timeout, maxRetries }: ModelOptions,
): DecisionModel {
	return {
		provider: 'typesafe',
		modelId,
		async decide(request: DecisionRequest): Promise<DecisionResponse> {
			const body = await typeSafeApiRequest<TypeSafeSystemOneResponse>(ctx, {
				method: 'POST',
				path: SYSTEM_ONE_PATH,
				body: {
					state: request.state,
					model: modelId,
					questions: toTypeSafeQuestions(request.questions),
				} as IDataObject,
				timeout,
				maxRetries,
			});

			return toDecisionResponse(body);
		},
	};
}

export class DecisionModelTypeSafe implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TypeSafe Jev Decision Model',
		name: 'decisionModelTypeSafe',
		icon: 'fa:balance-scale-left',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Make structured, probabilistic decisions with TypeSafe’s Jev model',
		defaults: {
			name: 'TypeSafe Jev Decision Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Decision Models'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.decisionmodeltypesafe/',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiDecisionModel],
		outputNames: ['Decision Model'],
		credentials: [
			{
				name: 'typeSafeApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials.url }}',
		},
		properties: [
			{
				displayName:
					'Jev evaluates a state against typed questions. It is not a chat model, so it only connects to a Decision node.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description:
					'The model that evaluates the questions. <a href="https://docs.typesafe.ai/concepts/system-one">Learn more</a>.',
				default: DEFAULT_MODEL,
				typeOptions: {
					// Lists the account's models. Costs no inference.
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/v1/models',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'models',
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.name}}',
											value: '={{$responseItem.name}}',
											description: '={{$responseItem.description}}',
										},
									},
									{
										type: 'sort',
										properties: {
											key: 'name',
										},
									},
								],
							},
						},
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
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						default: DEFAULT_TIMEOUT,
						description: 'Maximum amount of time a request is allowed to take in milliseconds',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						default: DEFAULT_MAX_RETRIES,
						description:
							'How many times to retry a request that failed because of a rate limit, an overload, or a connection problem',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const modelId = this.getNodeParameter('model', itemIndex, DEFAULT_MODEL) as string;
		const { timeout = DEFAULT_TIMEOUT, maxRetries = DEFAULT_MAX_RETRIES } = this.getNodeParameter(
			'options',
			itemIndex,
			{},
		) as NodeOptions;

		return supplyDecisionModel(this, createTypeSafeModel(this, { modelId, timeout, maxRetries }));
	}
}
