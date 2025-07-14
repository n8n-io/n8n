/* eslint-disable n8n-nodes-base/node-param-description-wrong-for-dynamic-options */
/* eslint-disable n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options */
import type { BaseCallbackHandler, CallbackHandlerMethods } from '@langchain/core/callbacks/base';
import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type ILoadOptionsFunctions,
	NodeOperationError,
} from 'n8n-workflow';

import { numberInputsProperty, configuredInputs } from './helpers';
import { N8nLlmTracing } from '../llms/N8nLlmTracing';
import { N8nNonEstimatingTracing } from '../llms/N8nNonEstimatingTracing';

interface ModeleSelectionRule {
	modelIndex: number;
	conditions: {
		options: {
			caseSensitive: boolean;
			typeValidation: 'strict' | 'loose';
			leftValue: string;
			version: 1 | 2;
		};
		conditions: Array<{
			id: string;
			leftValue: string;
			rightValue: string;
			operator: {
				type: string;
				operation: string;
				name: string;
			};
		}>;
		combinator: 'and' | 'or';
	};
}

function getCallbacksArray(
	callbacks: Callbacks | undefined,
): Array<BaseCallbackHandler | CallbackHandlerMethods> {
	if (!callbacks) return [];

	if (Array.isArray(callbacks)) {
		return callbacks;
	}

	// If it's a CallbackManager, extract its handlers
	return callbacks.handlers || [];
}

export class ModelSelector implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Model Selector',
		name: 'modelSelector',
		icon: 'fa:map-signs',
		iconColor: 'green',
		defaults: {
			name: 'Model Selector',
		},
		version: 1,
		group: ['transform'],
		description:
			'Use this node to select one of the connected models to this node based on workflow data',
		inputs: `={{
				((parameters) => {
					${configuredInputs.toString()};
					return configuredInputs(parameters)
				})($parameter)
			}}`,
		outputs: [NodeConnectionTypes.AiLanguageModel],
		requiredInputs: 1,
		properties: [
			numberInputsProperty,
			{
				displayName: 'Rules',
				name: 'rules',
				placeholder: 'Add Rule',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				description: 'Rules to map workflow data to specific models',
				default: {},
				options: [
					{
						displayName: 'Rule',
						name: 'rule',
						values: [
							{
								displayName: 'Model',
								name: 'modelIndex',
								type: 'options',
								description: 'Choose model input from the list',
								default: 1,
								required: true,
								placeholder: 'Choose model input from the list',
								typeOptions: {
									loadOptionsMethod: 'getModels',
								},
							},
							{
								displayName: 'Conditions',
								name: 'conditions',
								placeholder: 'Add Condition',
								type: 'filter',
								default: {},
								typeOptions: {
									filter: {
										caseSensitive: true,
										typeValidation: 'strict',
										version: 2,
									},
								},
								description: 'Conditions that must be met to select this model',
							},
						],
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions) {
				const numberInputs = this.getCurrentNodeParameter('numberInputs') as number;

				return Array.from({ length: numberInputs ?? 2 }, (_, i) => ({
					value: i + 1,
					name: `Model ${(i + 1).toString()}`,
				}));
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const models = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			itemIndex,
		)) as unknown[];

		if (!models || models.length === 0) {
			throw new NodeOperationError(this.getNode(), 'No models connected', {
				itemIndex,
				description: 'No models found in input connections',
			});
		}
		models.reverse();

		const rules = this.getNodeParameter('rules.rule', itemIndex, []) as ModeleSelectionRule[];

		if (!rules || rules.length === 0) {
			throw new NodeOperationError(this.getNode(), 'No rules defined', {
				itemIndex,
				description: 'At least one rule must be defined to select a model',
			});
		}

		for (let i = 0; i < rules.length; i++) {
			const rule = rules[i];
			const modelIndex = rule.modelIndex;

			if (modelIndex <= 0 || modelIndex > models.length) {
				throw new NodeOperationError(this.getNode(), `Invalid model index ${modelIndex}`, {
					itemIndex,
					description: `Model index must be between 1 and ${models.length}`,
				});
			}

			const conditionsMet = this.getNodeParameter(`rules.rule[${i}].conditions`, itemIndex, false, {
				extractValue: true,
			}) as boolean;

			if (conditionsMet) {
				const selectedModel = models[modelIndex - 1] as BaseChatModel;

				const originalCallbacks = getCallbacksArray(selectedModel.callbacks);

				for (const currentCallback of originalCallbacks) {
					if (currentCallback instanceof N8nLlmTracing) {
						currentCallback.setParentRunIndex(this.getNextRunIndex());
					}
				}
				const modelSelectorTracing = new N8nNonEstimatingTracing(this);
				selectedModel.callbacks = [...originalCallbacks, modelSelectorTracing];

				return {
					response: selectedModel,
				};
			}
		}

		throw new NodeOperationError(this.getNode(), 'No matching rule found', {
			itemIndex,
			description: 'None of the defined rules matched the workflow data',
		});
	}
}
