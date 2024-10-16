import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { getModelNameForTiktoken } from '@langchain/core/language_models/base';
import { encodingForModel } from '@langchain/core/utils/tiktoken';
import type {
	Serialized,
	SerializedNotImplemented,
	SerializedSecret,
} from '@langchain/core/load/serializable';
import type { LLMResult } from '@langchain/core/outputs';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { pick } from 'lodash';
import type { BaseMessage } from '@langchain/core/messages';
import type { SerializedFields } from '@langchain/core/dist/load/map_keys';
import { logAiEvent } from '../../utils/helpers';

type TokensUsageParser = (llmOutput: LLMResult['llmOutput']) => {
	completionTokens: number;
	promptTokens: number;
	totalTokens: number;
};

type RunDetail = {
	index: number;
	messages: BaseMessage[] | string[] | string;
	options: SerializedSecret | SerializedNotImplemented | SerializedFields;
};

const TIKTOKEN_ESTIMATE_MODEL = 'gpt-3.5-turbo';
export class N8nLlmTracing extends BaseCallbackHandler {
	name = 'N8nLlmTracing';

	executionFunctions: IExecuteFunctions;

	connectionType = NodeConnectionType.AiLanguageModel;

	promptTokensEstimate = 0;

	completionTokensEstimate = 0;

	/**
	 * A map to associate LLM run IDs to run details.
	 * Key: Unique identifier for each LLM run (run ID)
	 * Value: RunDetails object
	 *
	 */
	runsMap: Record<string, RunDetail> = {};

	options = {
		// Default(OpenAI format) parser
		tokensUsageParser: (llmOutput: LLMResult['llmOutput']) => {
			const completionTokens = (llmOutput?.tokenUsage?.completionTokens as number) ?? 0;
			const promptTokens = (llmOutput?.tokenUsage?.promptTokens as number) ?? 0;

			return {
				completionTokens,
				promptTokens,
				totalTokens: completionTokens + promptTokens,
			};
		},
	};

	constructor(
		executionFunctions: IExecuteFunctions,
		options?: { tokensUsageParser: TokensUsageParser },
	) {
		super();
		this.executionFunctions = executionFunctions;
		this.options = { ...this.options, ...options };
	}

	async estimateTokensFromGeneration(generations: LLMResult['generations']) {
		const messages = generations.flatMap((gen) => gen.map((g) => g.text));
		return await this.estimateTokensFromStringList(messages);
	}

	async estimateTokensFromStringList(list: string[]) {
		const embeddingModel = getModelNameForTiktoken(TIKTOKEN_ESTIMATE_MODEL);
		const encoder = await encodingForModel(embeddingModel);

		const encodedListLength = await Promise.all(
			list.map(async (text) => encoder.encode(text).length),
		);

		return encodedListLength.reduce((acc, curr) => acc + curr, 0);
	}

	async handleLLMEnd(output: LLMResult, runId: string) {
		// The fallback should never happen since handleLLMStart should always set the run details
		// but just in case, we set the index to the length of the runsMap
		const runDetails = this.runsMap[runId] ?? { index: Object.keys(this.runsMap).length };

		output.generations = output.generations.map((gen) =>
			gen.map((g) => pick(g, ['text', 'generationInfo'])),
		);

		const tokenUsageEstimate = {
			completionTokens: 0,
			promptTokens: 0,
			totalTokens: 0,
		};
		const tokenUsage = this.options.tokensUsageParser(output.llmOutput);

		if (output.generations.length > 0) {
			tokenUsageEstimate.completionTokens = await this.estimateTokensFromGeneration(
				output.generations,
			);

			tokenUsageEstimate.promptTokens = this.promptTokensEstimate;
			tokenUsageEstimate.totalTokens =
				tokenUsageEstimate.completionTokens + this.promptTokensEstimate;
		}
		const response: {
			response: { generations: LLMResult['generations'] };
			tokenUsageEstimate?: typeof tokenUsageEstimate;
			tokenUsage?: typeof tokenUsage;
		} = {
			response: { generations: output.generations },
		};

		// If the LLM response contains actual tokens usage, otherwise fallback to the estimate
		if (tokenUsage.completionTokens > 0) {
			response.tokenUsage = tokenUsage;
		} else {
			response.tokenUsageEstimate = tokenUsageEstimate;
		}

		const parsedMessages =
			typeof runDetails.messages === 'string'
				? runDetails.messages
				: runDetails.messages.map((message) => {
						if (typeof message === 'string') return message;
						if (typeof message?.toJSON === 'function') return message.toJSON();

						return message;
					});

		this.executionFunctions.addOutputData(this.connectionType, runDetails.index, [
			[{ json: { ...response } }],
		]);
		void logAiEvent(this.executionFunctions, 'ai-llm-generated-output', {
			messages: parsedMessages,
			options: runDetails.options,
			response,
		});
	}

	async handleLLMStart(llm: Serialized, prompts: string[], runId: string) {
		const estimatedTokens = await this.estimateTokensFromStringList(prompts);

		const options = llm.type === 'constructor' ? llm.kwargs : llm;
		const { index } = this.executionFunctions.addInputData(this.connectionType, [
			[
				{
					json: {
						messages: prompts,
						estimatedTokens,
						options,
					},
				},
			],
		]);

		// Save the run details for later use when processing `handleLLMEnd` event
		this.runsMap[runId] = {
			index,
			options,
			messages: prompts,
		};
		this.promptTokensEstimate = estimatedTokens;
	}

	async handleLLMError(
		error: IDataObject | Error,
		runId: string,
		parentRunId?: string | undefined,
	) {
		// Filter out non-x- headers to avoid leaking sensitive information in logs
		if (typeof error === 'object' && error?.hasOwnProperty('headers')) {
			const errorWithHeaders = error as { headers: Record<string, unknown> };

			Object.keys(errorWithHeaders.headers).forEach((key) => {
				if (!key.startsWith('x-')) {
					delete errorWithHeaders.headers[key];
				}
			});
		}

		void logAiEvent(this.executionFunctions, 'ai-llm-errored', {
			error: Object.keys(error).length === 0 ? error.toString() : error,
			runId,
			parentRunId,
		});
	}
}
