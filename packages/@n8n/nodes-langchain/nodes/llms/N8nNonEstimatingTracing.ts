import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { SerializedFields } from '@langchain/core/dist/load/map_keys';
import type {
	Serialized,
	SerializedNotImplemented,
	SerializedSecret,
} from '@langchain/core/load/serializable';
import type { BaseMessage } from '@langchain/core/messages';
import type { LLMResult } from '@langchain/core/outputs';
import pick from 'lodash/pick';
import type { IDataObject, ISupplyDataFunctions, JsonObject } from 'n8n-workflow';
import { NodeConnectionTypes, NodeError, NodeOperationError } from 'n8n-workflow';

import { logAiEvent } from '@utils/helpers';

type RunDetail = {
	index: number;
	messages: BaseMessage[] | string[] | string;
	options: SerializedSecret | SerializedNotImplemented | SerializedFields;
};

export class N8nNonEstimatingTracing extends BaseCallbackHandler {
	name = 'N8nNonEstimatingTracing';

	// This flag makes sure that LangChain will wait for the handlers to finish before continuing
	// This is crucial for the handleLLMError handler to work correctly (it should be called before the error is propagated to the root node)
	awaitHandlers = true;

	connectionType = NodeConnectionTypes.AiLanguageModel;

	#parentRunIndex?: number;

	/**
	 * A map to associate LLM run IDs to run details.
	 * Key: Unique identifier for each LLM run (run ID)
	 * Value: RunDetails object
	 *
	 */
	runsMap: Record<string, RunDetail> = {};

	options = {
		// Default(OpenAI format) parser
		errorDescriptionMapper: (error: NodeError) => error.description,
	};

	constructor(
		private executionFunctions: ISupplyDataFunctions,
		options?: {
			errorDescriptionMapper?: (error: NodeError) => string;
		},
	) {
		super();
		this.options = { ...this.options, ...options };
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
		const response: {
			response: { generations: LLMResult['generations'] };
			tokenUsageEstimate?: typeof tokenUsageEstimate;
		} = {
			response: { generations: output.generations },
		};

		response.tokenUsageEstimate = tokenUsageEstimate;

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
			undefined,
			sourceNodeRunIndex,
		);

		logAiEvent(this.executionFunctions, 'ai-llm-generated-output', {
			messages: parsedMessages,
			options: runDetails.options,
			response,
		});
	}

	async handleLLMStart(llm: Serialized, prompts: string[], runId: string) {
		const estimatedTokens = 0;
		const sourceNodeRunIndex =
			this.#parentRunIndex !== undefined
				? this.#parentRunIndex + this.executionFunctions.getNextRunIndex()
				: undefined;

		const options = llm.type === 'constructor' ? llm.kwargs : llm;
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
		};
	}

	async handleLLMError(error: IDataObject | Error, runId: string, parentRunId?: string) {
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

	// Used to associate subsequent runs with the correct parent run in subnodes of subnodes
	setParentRunIndex(runIndex: number) {
		this.#parentRunIndex = runIndex;
	}
}
