import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { getModelNameForTiktoken } from '@langchain/core/language_models/base';
import { encodingForModel } from '@langchain/core/utils/tiktoken';
import type { Serialized } from '@langchain/core/load/serializable';
import type { LLMResult } from '@langchain/core/outputs';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { pick } from 'lodash';

type TokensUsageParser = (llmOutput: LLMResult['llmOutput']) => {
	completionTokens: number;
	promptTokens: number;
	totalTokens: number;
};

export class N8nLlmTracing extends BaseCallbackHandler {
	name = 'N8nLlmTracing';

	executionFunctions: IExecuteFunctions;

	connectionType = NodeConnectionType.AiLanguageModel;

	lastIndex = 0;

	promptTokensEstimate = 0;

	completionTokensEstimate = 0;

	options = {
		// Default(OpenAI style) parser
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
		const embeddingModel = getModelNameForTiktoken('gpt-3.5-turbo');
		const encoder = await encodingForModel(embeddingModel);

		const encodedListLength = await Promise.all(
			list.map(async (text) => encoder.encode(text).length),
		);

		return encodedListLength.reduce((acc, curr) => acc + curr, 0);
	}

	async handleLLMEnd(output: LLMResult) {
		output.generations = output.generations.map((gen) =>
			gen.map((g) => {
				return pick(g, ['text', 'generationInfo']);
			}),
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

		if (tokenUsage.completionTokens > 0) {
			response.tokenUsage = tokenUsage;
		} else {
			response.tokenUsageEstimate = tokenUsageEstimate;
		}

		this.executionFunctions.addOutputData(this.connectionType, this.lastIndex, [
			[{ json: { ...response } }],
		]);
	}

	async handleLLMStart(llm: Serialized, prompts: string[]) {
		const estimatedTokens = await this.estimateTokensFromStringList(prompts);

		const { index } = this.executionFunctions.addInputData(
			this.connectionType,
			[
				[
					{
						json: {
							messages: prompts,
							estimatedTokens,
							options: llm.type === 'constructor' ? llm.kwargs : llm,
						},
					},
				],
			],
			this.lastIndex + 1,
		);

		this.lastIndex = index;
		this.promptTokensEstimate = estimatedTokens;
	}
}
