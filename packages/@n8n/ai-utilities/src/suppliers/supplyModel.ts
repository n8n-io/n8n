import type { ServerTool } from '@langchain/core/tools';
import { ChatOpenAI, type ClientOptions } from '@langchain/openai';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { LangchainAdapter } from '../adapters/langchain-chat-model';
import { BaseChatModel } from '../chat-model/base';
import type { ChatModel } from '../types/chat-model';
import type { OpenAIModelOptions } from '../types/openai';
import { makeN8nLlmFailedAttemptHandler } from '../utils/failed-attempt-handler/n8nLlmFailedAttemptHandler';
import { getProxyAgent } from '../utils/http-proxy-agent';
import { N8nLlmTracing } from '../utils/n8n-llm-tracing';

type OpenAiModel = OpenAIModelOptions & {
	type: 'openai';
};
export type SupplyModelOptions = ChatModel | OpenAiModel;

function isOpenAiModel(model: SupplyModelOptions): model is OpenAiModel {
	return 'type' in model && model.type === 'openai' && !(model instanceof BaseChatModel);
}

function getOpenAiModel(ctx: ISupplyDataFunctions, model: OpenAiModel) {
	const clientConfiguration: ClientOptions = {
		baseURL: model.baseUrl,
	};

	if (model.defaultHeaders) {
		clientConfiguration.defaultHeaders = model.defaultHeaders;
	}

	const timeout = model.timeout;
	clientConfiguration.fetchOptions = {
		dispatcher: getProxyAgent(model.baseUrl, {
			headersTimeout: timeout,
			bodyTimeout: timeout,
		}),
	};

	const openAiModel = new ChatOpenAI({
		configuration: clientConfiguration,
		model: model.model,
		apiKey: model.apiKey,
		useResponsesApi: model.useResponsesApi,
		logprobs: model.logprobs,
		topLogprobs: model.topLogprobs,
		supportsStrictToolCalling: model.supportsStrictToolCalling,
		reasoning: model.reasoning,
		zdrEnabled: model.zdrEnabled,
		service_tier: model.service_tier,
		promptCacheKey: model.promptCacheKey,
		temperature: model.temperature,
		topP: model.topP,
		frequencyPenalty: model.frequencyPenalty,
		presencePenalty: model.presencePenalty,
		stopSequences: model.stopSequences,
		maxRetries: model.maxRetries,
		modelKwargs: model.additionalParams,
		verbosity: model.verbosity,
		streaming: model.streaming,
		streamUsage: model.streamUsage,
		stop: model.stop,
		maxTokens: model.maxTokens,
		maxCompletionTokens: model.maxCompletionTokens,
		timeout: model.timeout,
		callbacks: [new N8nLlmTracing(ctx)],
		onFailedAttempt: makeN8nLlmFailedAttemptHandler(ctx, model.onFailedAttempt),
	});

	if (model.providerTools?.length) {
		openAiModel.metadata = {
			...openAiModel.metadata,
			// Tools in metadata are read by ToolAgent and added to a list of all agent tools.
			tools: model.providerTools.map<ServerTool>((tool) => ({
				// openai format requires type to be the name of the tool
				// langchain simply passes the tool object to openai as is
				type: tool.name,
				...tool.args,
			})),
		};
	}

	return openAiModel;
}

export function supplyModel(ctx: ISupplyDataFunctions, model: SupplyModelOptions) {
	if (isOpenAiModel(model)) {
		const openAiModel = getOpenAiModel(ctx, model);
		return {
			response: openAiModel,
		};
	}
	const adapter = new LangchainAdapter(model, ctx);
	return {
		response: adapter,
	};
}
