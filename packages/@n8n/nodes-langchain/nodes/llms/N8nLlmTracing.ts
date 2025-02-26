import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { SerializedFields } from '@langchain/core/dist/load/map_keys';
import { getModelNameForTiktoken } from '@langchain/core/language_models/base';
import type {
	Serialized,
	SerializedNotImplemented,
	SerializedSecret,
} from '@langchain/core/load/serializable';
import type { BaseMessage } from '@langchain/core/messages';
import type { LLMResult } from '@langchain/core/outputs';
import { encodingForModel } from '@langchain/core/utils/tiktoken';
import { pick } from 'lodash';
import type { IDataObject, ISupplyDataFunctions, JsonObject } from 'n8n-workflow';
import { NodeConnectionType, NodeError, NodeOperationError } from 'n8n-workflow';

import { logAiEvent } from '@utils/helpers';

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

const TIKTOKEN_ESTIMATE_MODEL = 'gpt-4o';
export class N8nLlmTracing extends BaseCallbackHandler {
	name = 'N8nLlmTracing';

	// This flag makes sure that LangChain will wait for the handlers to finish before continuing
	// This is crucial for the handleLLMError handler to work correctly (it should be called before the error is propagated to the root node)
	awaitHandlers = true;

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
		errorDescriptionMapper: (error: NodeError) => error.description,
	};

	constructor(
		private executionFunctions: ISupplyDataFunctions,
		options?: {
			tokensUsageParser?: TokensUsageParser;
			errorDescriptionMapper?: (error: NodeError) => string;
		},
	) {
		super();
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
		// 1. Retrieve run details (index, messages, etc.)
		const runDetails = this.runsMap[runId] ?? { index: Object.keys(this.runsMap).length };

		const showThinking = this.executionFunctions.getNodeParameter(
			'showThinking',
			runDetails.index,
			false,
		) as boolean;

		// Read the format from node parameters, e.g. "default" or "json"
		const format = this.executionFunctions.getNodeParameter(
			'options.format',
			runDetails.index,
			'default',
		) as string;

		// 2. Flatten all generations’ text into one combined string
		let combinedText = output.generations
			.flatMap((generationArray) => generationArray.map((gen) => gen.text))
			.join('\n\n');

		// 3. Strip <think>...</think> tags if showThinking is false
		if (!showThinking) {
			combinedText = combinedText.replace(/<think>[\s\S]*?<\/think>/g, '');
		}

		// 4. If format is 'json', parse a code block if present
		if (format === 'json') {
			const jsonMatch = combinedText.match(/```json\s*([\s\S]*?)\s*```/);
			if (jsonMatch) {
				try {
					const parsedJson = JSON.parse(jsonMatch[1]);
					// Example: store the re-stringified JSON
					combinedText = JSON.stringify(parsedJson, null, 2);
				} catch (err) {
					console.warn('Failed to parse JSON code block:', err);
				}
			}
		}

		// 5. Overwrite output.generations to hold just one final combined generation
		output.generations = [
			[
				{
					text: combinedText,
					// Preserve any generationInfo you want, or leave it empty if you prefer
					generationInfo: {},
				},
			],
		];

		// 6. Compute token usage or estimates as you were doing
		const tokenUsageEstimate = {
			completionTokens: 0,
			promptTokens: 0,
			totalTokens: 0,
		};
		const tokenUsage = this.options.tokensUsageParser(output.llmOutput);

		if (output.generations.length > 0) {
			// Estimate completion tokens from the final text
			tokenUsageEstimate.completionTokens = await this.estimateTokensFromGeneration(
				output.generations,
			);
			tokenUsageEstimate.promptTokens = this.promptTokensEstimate;
			tokenUsageEstimate.totalTokens =
				tokenUsageEstimate.completionTokens + this.promptTokensEstimate;
		}

		// Build the response object for output
		const response: {
			response: { generations: LLMResult['generations'] };
			tokenUsageEstimate?: typeof tokenUsageEstimate;
			tokenUsage?: typeof tokenUsage;
		} = {
			response: { generations: output.generations },
		};

		// If the LLM returned real token usage, attach it; otherwise attach estimate
		if (tokenUsage.completionTokens > 0) {
			response.tokenUsage = tokenUsage;
		} else {
			response.tokenUsageEstimate = tokenUsageEstimate;
		}

		// 7. (Optional) Log the messages used in the prompt
		const parsedMessages =
			typeof runDetails.messages === 'string'
				? runDetails.messages
				: runDetails.messages.map((message) => {
						if (typeof message === 'string') return message;
						if (typeof message?.toJSON === 'function') return message.toJSON();
						return message;
					});

		// 8. Send the final response object to n8n
		this.executionFunctions.addOutputData(this.connectionType, runDetails.index, [
			[{ json: { ...response } }],
		]);

		// 9. Log event (if needed)
		logAiEvent(this.executionFunctions, 'ai-llm-generated-output', {
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
		const runDetails = this.runsMap[runId] ?? { index: Object.keys(this.runsMap).length };

		// Filter out non-x- headers to avoid leaking sensitive information in logs
		if (typeof error === 'object' && error?.hasOwnProperty('headers')) {
			const errorWithHeaders = error as { headers: Record<string, unknown> };

			Object.keys(errorWithHeaders.headers).forEach((key) => {
				if (!key.startsWith('x-')) {
					delete errorWithHeaders.headers[key];
				}
			});
		}

		if (error instanceof NodeError) {
			if (this.options.errorDescriptionMapper) {
				error.description = this.options.errorDescriptionMapper(error);
			}

			this.executionFunctions.addOutputData(this.connectionType, runDetails.index, error);
		} else {
			// If the error is not a NodeError, we wrap it in a NodeOperationError
			this.executionFunctions.addOutputData(
				this.connectionType,
				runDetails.index,
				new NodeOperationError(this.executionFunctions.getNode(), error as JsonObject, {
					functionality: 'configuration-node',
				}),
			);
		}

		logAiEvent(this.executionFunctions, 'ai-llm-errored', {
			error: Object.keys(error).length === 0 ? error.toString() : error,
			runId,
			parentRunId,
		});
	}
}
