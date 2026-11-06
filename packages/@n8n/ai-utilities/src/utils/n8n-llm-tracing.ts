import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { SerializedFields } from '@langchain/core/dist/load/map_keys';
import { getModelNameForTiktoken } from '@langchain/core/language_models/base';
import type {
	Serialized,
	SerializedNotImplemented,
	SerializedSecret,
} from '@langchain/core/load/serializable';
import type { BaseMessage } from '@langchain/core/messages';
import type { Generation, LLMResult } from '@langchain/core/outputs';
import type { IDataObject, ISupplyDataFunctions, ITaskMetadata, JsonObject } from 'n8n-workflow';
import { NodeConnectionTypes, NodeError, NodeOperationError } from 'n8n-workflow';

import { buildChatGenAiAttributes, type GenAiProviderName } from '../gen-ai';
import { LangChainUsageTracker } from '../llm-usage/langchain-handler';
import { credentialFromNode, providerFromCredentials } from '../llm-usage/report';
import { checkLlmCall } from '../llm-usage/state';
import { extractRespondingModel, toRunDataGeneration } from './extract-responding-model';
import { logAiEvent } from './log-ai-event';
import { redactHeaderValues } from './redact-headers';
import { stripNonXHeaders } from './strip-non-x-headers';
import { estimateTokensFromStringList } from './tokenizer/token-estimator';

/** Normalized token usage returned by TokensUsageParser. */
type TokenUsageResult = {
	completionTokens: number;
	promptTokens: number;
	totalTokens: number;
	/** Cost may be undefined when the provider returns token counts but no pricing fields. */
	cost?: number;
};

/** Raw provider tokenUsage payload. Some providers report `totalCost` instead of `cost`. */
type ProviderTokenUsageResult = TokenUsageResult & {
	totalCost?: number;
};

type TokensUsageParser = (result: LLMResult) => TokenUsageResult;

/** Anthropic Messages usage. Cached input tokens count as prompt tokens. */
export function anthropicTokensUsageParser(result: LLMResult): TokenUsageResult {
	const usage = (result?.llmOutput?.usage as
		| {
				input_tokens: number;
				output_tokens: number;
				cache_creation_input_tokens?: number;
				cache_read_input_tokens?: number;
		  }
		| undefined) ?? { input_tokens: 0, output_tokens: 0 };
	const promptTokens =
		usage.input_tokens +
		(usage.cache_creation_input_tokens ?? 0) +
		(usage.cache_read_input_tokens ?? 0);
	return {
		completionTokens: usage.output_tokens,
		promptTokens,
		totalTokens: promptTokens + usage.output_tokens,
	};
}

type RunDetail = {
	index: number;
	messages: BaseMessage[] | string[] | string;
	options: SerializedSecret | SerializedNotImplemented | SerializedFields;
	isChatModel?: boolean;
	requestModel?: string;
};

const TIKTOKEN_ESTIMATE_MODEL = 'gpt-4o';

type TracingWriter = {
	setMetadata: (metadata: { tracing: LlmTokenTracingMetadata }) => void;
};

/** Keys written by `applyTracingTokenMetadata` into execution tracing metadata. */
type LlmTokenTracingMetadata = {
	'llm.tokens.in': number;
	'llm.tokens.out': number;
	'llm.tokens.total': number;
	'llm.tokens.estimated': boolean;
	'llm.cost.total'?: number;
};

function canWriteTracingMetadata(context: unknown): context is TracingWriter {
	return (
		typeof context === 'object' &&
		context !== null &&
		'setMetadata' in context &&
		typeof context.setMetadata === 'function'
	);
}

export class N8nLlmTracing extends BaseCallbackHandler {
	name = 'N8nLlmTracing';

	// This flag makes sure that LangChain will wait for the handlers to finish before continuing
	// This is crucial for the handleLLMError handler to work correctly (it should be called before the error is propagated to the root node)
	awaitHandlers = true;

	connectionType = NodeConnectionTypes.AiLanguageModel;

	promptTokensEstimate = 0;

	completionTokensEstimate = 0;

	#parentRunIndex?: number;

	private readonly usageTracker = new LangChainUsageTracker();

	/**
	 * A map to associate LLM run IDs to run details.
	 * Key: Unique identifier for each LLM run (run ID)
	 * Value: RunDetails object
	 *
	 */
	runsMap: Record<string, RunDetail> = {};

	options: {
		tokensUsageParser: TokensUsageParser;
		errorDescriptionMapper: (error: NodeError) => string | null | undefined;
		redactedHeaders?: string[];
		genAiProviderName?: GenAiProviderName;
	} = {
		// Default(OpenAI format) parser
		tokensUsageParser: (result: LLMResult) => {
			const tokenUsage = result?.llmOutput?.tokenUsage as
				| Partial<ProviderTokenUsageResult>
				| undefined;
			const completionTokens = tokenUsage?.completionTokens ?? 0;
			const promptTokens = tokenUsage?.promptTokens ?? 0;
			const cost = tokenUsage?.cost ?? tokenUsage?.totalCost;

			return {
				completionTokens,
				promptTokens,
				totalTokens: completionTokens + promptTokens,
				cost,
			};
		},
		errorDescriptionMapper: (error: NodeError) => error.description,
	};

	constructor(
		private executionFunctions: ISupplyDataFunctions,
		options?: {
			tokensUsageParser?: TokensUsageParser;
			errorDescriptionMapper?: (error: NodeError) => string;
			redactedHeaders?: string[];
			genAiProviderName?: GenAiProviderName;
		},
	) {
		super();
		this.options = { ...this.options, ...options };
	}

	/**
	 * The vendor that the node's credential names. Nodes built on the OpenAI client (DeepSeek,
	 * xAI, OpenRouter and others) report `openai` to LangChain.
	 */
	private credentialProvider(): string | undefined {
		return providerFromCredentials(
			Object.keys(this.executionFunctions.getNode().credentials ?? {}),
		);
	}

	/**
	 * Rejects when a policy blocks the call. LangChain rethrows a handler error only with
	 * `raiseError`, so it is set right before the throw: until then, hook errors are only logged.
	 */
	private async checkCall(metadata?: Record<string, unknown>) {
		const context = this.executionFunctions.getLlmUsageContext?.();
		if (!context) return;
		try {
			await checkLlmCall({
				context,
				credential: credentialFromNode(this.executionFunctions.getNode().credentials),
				provider: this.credentialProvider(),
				model: typeof metadata?.ls_model_name === 'string' ? metadata.ls_model_name : undefined,
			});
		} catch (error) {
			this.raiseError = true;
			throw error;
		}
	}

	async estimateTokensFromGeneration(generations: LLMResult['generations']) {
		const messages = generations.flatMap((gen) => gen.map((g) => g.text));
		return await this.estimateTokensFromStringList(messages);
	}

	async estimateTokensFromStringList(list: string[]) {
		const embeddingModel = getModelNameForTiktoken(TIKTOKEN_ESTIMATE_MODEL);
		return await estimateTokensFromStringList(list, embeddingModel);
	}

	async handleLLMEnd(output: LLMResult, runId: string) {
		// Read the usage before the generations are converted for the logs panel below.
		this.usageTracker.end(
			output,
			runId,
			this.executionFunctions.getLlmUsageContext?.(),
			this.credentialProvider(),
			credentialFromNode(this.executionFunctions.getNode().credentials),
		);

		// The fallback should never happen since handleLLMStart should always set the run details
		// but just in case, we set the index to the length of the runsMap
		const runDetails = this.runsMap[runId] ?? { index: Object.keys(this.runsMap).length };

		output.generations = output.generations.map((gen) => gen.map(toRunDataGeneration));

		const tokenUsageEstimate = {
			completionTokens: 0,
			promptTokens: 0,
			totalTokens: 0,
		};
		const tokenUsage = this.options.tokensUsageParser(output);

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

		const isUsageReported = tokenUsage.completionTokens > 0;

		// If the LLM response contains actual tokens usage, otherwise fallback to the estimate
		if (isUsageReported) {
			response.tokenUsage = tokenUsage;
			this.applyTracingTokenMetadata({
				promptTokens: tokenUsage.promptTokens,
				completionTokens: tokenUsage.completionTokens,
				totalTokens: tokenUsage.totalTokens,
				isEstimated: false,
				cost: tokenUsage.cost,
			});
		} else {
			response.tokenUsageEstimate = tokenUsageEstimate;
			this.applyTracingTokenMetadata({
				promptTokens: tokenUsageEstimate.promptTokens,
				completionTokens: tokenUsageEstimate.completionTokens,
				totalTokens: tokenUsageEstimate.totalTokens,
				isEstimated: true,
			});
		}

		const parsedMessages =
			typeof runDetails.messages === 'string'
				? runDetails.messages
				: runDetails.messages.map((message) => {
						if (typeof message === 'string') return message;
						if (typeof message?.toJSON === 'function') return message.toJSON();

						return message;
					});

		const sourceNodeRunIndex =
			this.#parentRunIndex !== undefined ? this.#parentRunIndex + runDetails.index : undefined;

		this.executionFunctions.addOutputData(
			this.connectionType,
			runDetails.index,
			[[{ json: { ...response } }]],
			this.buildGenAiMetadata(
				runDetails,
				output.generations[0]?.[0],
				isUsageReported ? tokenUsage : undefined,
			),
			sourceNodeRunIndex,
		);

		logAiEvent(this.executionFunctions, 'ai-llm-generated-output', {
			messages: parsedMessages,
			options: runDetails.options,
			response,
		});
	}

	async handleLLMStart(
		llm: Serialized,
		prompts: string[],
		runId: string,
		_parentRunId?: string,
		_extraParams?: Record<string, unknown>,
		_tags?: string[],
		metadata?: Record<string, unknown>,
	) {
		await this.checkCall(metadata);
		this.usageTracker.start(runId, metadata);
		const estimatedTokens = await this.estimateTokensFromStringList(prompts);
		const sourceNodeRunIndex =
			this.#parentRunIndex !== undefined
				? this.#parentRunIndex + this.executionFunctions.getNextRunIndex()
				: undefined;

		const options = redactHeaderValues(
			llm.type === 'constructor' ? llm.kwargs : llm,
			this.options.redactedHeaders ?? [],
		);
		const { index } = this.executionFunctions.addInputData(
			this.connectionType,
			[
				[
					{
						json: {
							messages: prompts,
							estimatedTokens,
							options,
						},
					},
				],
			],
			sourceNodeRunIndex,
		);

		// Save the run details for later use when processing `handleLLMEnd` event
		this.runsMap[runId] = {
			index,
			options,
			messages: prompts,
			isChatModel: metadata?.ls_model_type === 'chat',
			requestModel:
				typeof metadata?.ls_model_name === 'string' ? metadata.ls_model_name : undefined,
		};
		this.promptTokensEstimate = estimatedTokens;
	}

	async handleLLMError(error: IDataObject | Error, runId: string, parentRunId?: string) {
		this.usageTracker.discard(runId);
		const runDetails = this.runsMap[runId] ?? { index: Object.keys(this.runsMap).length };

		stripNonXHeaders(error);

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
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			error: Object.keys(error).length === 0 ? error.toString() : error,
			runId,
			parentRunId,
		});
	}

	// Used to associate subsequent runs with the correct parent run in subnodes of subnodes
	setParentRunIndex(runIndex: number) {
		this.#parentRunIndex = runIndex;
	}

	private buildGenAiMetadata(
		runDetails: Partial<RunDetail>,
		generation: Generation | undefined,
		usage: TokenUsageResult | undefined,
	): ITaskMetadata | undefined {
		if (!runDetails.isChatModel) return undefined;

		return {
			tracing: buildChatGenAiAttributes({
				nodeType: this.executionFunctions.getNode().type,
				providerName: this.options.genAiProviderName,
				requestModel: runDetails.requestModel,
				responseModel: generation ? extractRespondingModel(generation) : undefined,
				usage,
			}),
		};
	}

	private applyTracingTokenMetadata(params: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		isEstimated: boolean;
		cost?: number;
	}) {
		if (!canWriteTracingMetadata(this.executionFunctions)) return;

		const tracing: LlmTokenTracingMetadata = {
			'llm.tokens.in': params.promptTokens,
			'llm.tokens.out': params.completionTokens,
			'llm.tokens.total': params.totalTokens,
			'llm.tokens.estimated': params.isEstimated,
		};
		if (typeof params.cost === 'number' && Number.isFinite(params.cost)) {
			tracing['llm.cost.total'] = params.cost;
		}

		this.executionFunctions.setMetadata({ tracing });
	}
}
