import {
	checkLlmCall,
	getLlmCallContext,
	getLlmUsageSink,
	reportLlmUsage,
	type LlmUsageCredential,
} from '@n8n/ai-utilities/llm-usage';
import type * as AiSdk from 'ai';

import { loadAi } from './lazy-ai';

type Middleware = AiSdk.LanguageModelMiddleware;
type ModelUsage = Awaited<ReturnType<NonNullable<Middleware['wrapGenerate']>>>['usage'];
type StreamResult = Awaited<ReturnType<NonNullable<Middleware['wrapStream']>>>;
type StreamPart = StreamResult['stream'] extends ReadableStream<infer Part> ? Part : never;
type WrappableModel = Parameters<typeof AiSdk.wrapLanguageModel>[0]['model'];

/** The models that this function returned, so that a model is never wrapped twice. */
const reportingModels = new WeakSet<object>();

/**
 * Reports every call of the model to the LLM usage sink: agent turns, titles, memory and
 * verification calls alike. `provider` is the configured provider; without it, the
 * model's transport name is used, which a proxied model reports as the proxy. `credential`
 * is the credential that the model was built with, when the host knows it.
 */
export function withLlmUsageReporting(
	model: WrappableModel,
	provider?: string,
	credential?: LlmUsageCredential,
): WrappableModel {
	// Without a sink (the llm-usage module is off), the model stays unwrapped: every stream part
	// would pass an extra transform for nothing. The module sets the sink at startup, before
	// any model is built.
	if (!getLlmUsageSink() || reportingModels.has(model)) return model;
	const providerName = provider ?? model.provider;

	// The host runs each agent turn in a call scope, which names the agent, project and user.
	const check = async () => {
		const context = getLlmCallContext();
		if (!context) return;
		await checkLlmCall({ context, credential, provider: providerName, model: model.modelId });
	};

	const report = (
		usage: ModelUsage,
		modelId: string,
		responseId: string | undefined,
		startedAt: Date,
	) => {
		// Reading usage runs inside the model call and its stream, so it must never throw there.
		try {
			// Some OpenAI-compatible endpoints send no usage; a row without tokens says nothing.
			if (usage.inputTokens.total === undefined && usage.outputTokens.total === undefined) return;
			reportLlmUsage({
				provider: providerName,
				model: modelId,
				providerResponseId: responseId,
				inputTokens: usage.inputTokens.total ?? 0,
				outputTokens: usage.outputTokens.total ?? 0,
				cacheReadTokens: usage.inputTokens.cacheRead,
				cacheWriteTokens: usage.inputTokens.cacheWrite,
				startedAt,
				finishedAt: new Date(),
				subType: 'llm',
				credential,
			});
		} catch {}
	};

	const wrapped = loadAi().wrapLanguageModel({
		model,
		middleware: {
			wrapGenerate: async ({ doGenerate }) => {
				await check();
				const startedAt = new Date();
				const result = await doGenerate();
				report(
					result.usage,
					result.response?.modelId ?? model.modelId,
					result.response?.id,
					startedAt,
				);
				return result;
			},
			wrapStream: async ({ doStream }) => {
				await check();
				const startedAt = new Date();
				const result = await doStream();
				let modelId = model.modelId;
				let responseId: string | undefined;
				return {
					...result,
					stream: result.stream.pipeThrough(
						new TransformStream<StreamPart, StreamPart>({
							transform(chunk, controller) {
								if (chunk.type === 'response-metadata') {
									modelId = chunk.modelId ?? modelId;
									responseId = chunk.id ?? responseId;
								}
								if (chunk.type === 'finish') report(chunk.usage, modelId, responseId, startedAt);
								controller.enqueue(chunk);
							},
						}),
					),
				};
			},
		},
	});
	reportingModels.add(wrapped);
	return wrapped;
}
