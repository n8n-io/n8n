import type { ISupplyDataFunctions, SupplyData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { DecisionModel, DecisionRequest, DecisionResponse } from '../types/decision-model';
import { callMethodAsync } from '../utils/log-wrapper';

export interface SupplyDecisionModelOptions {
	closeFunction?: () => Promise<void>;
}

/**
 * Wraps a decision model so every `decide` call shows up in the execution log
 * of the sub-node, and so provider errors are attributed to the sub-node rather
 * than to the root node that called it.
 *
 * `logWrapper` cannot serve this contract: it dispatches on LangChain base
 * classes, and a decision model is a plain object.
 */
export function supplyDecisionModel(
	context: ISupplyDataFunctions,
	model: DecisionModel,
	options?: SupplyDecisionModelOptions,
): SupplyData {
	const logged: DecisionModel = {
		provider: model.provider,
		modelId: model.modelId,
		async decide(request: DecisionRequest): Promise<DecisionResponse> {
			const connectionType = NodeConnectionTypes.AiDecisionModel;
			const { index } = context.addInputData(connectionType, [
				[{ json: { model: model.modelId, ...request } }],
			]);

			const response = (await callMethodAsync.call(model, {
				executeFunctions: context,
				connectionType,
				currentNodeRunIndex: index,
				method: model.decide.bind(model),
				arguments: [request],
			})) as DecisionResponse;

			context.addOutputData(connectionType, index, [[{ json: { ...response } }]]);

			return response;
		},
	};

	return {
		response: logged,
		closeFunction: options?.closeFunction,
	};
}
