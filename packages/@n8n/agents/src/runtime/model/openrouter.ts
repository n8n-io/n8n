import type * as AiSdk from 'ai';

import { loadAi } from './lazy-ai';
import { mergeProviderOptions } from './prompt-cache';

type MiddlewareGenerate = NonNullable<AiSdk.LanguageModelMiddleware['wrapGenerate']>;
type CallOptions = Parameters<MiddlewareGenerate>[0]['params'];
type ModelUsage = Awaited<ReturnType<MiddlewareGenerate>>['usage'];
type StreamResult = Awaited<ReturnType<NonNullable<AiSdk.LanguageModelMiddleware['wrapStream']>>>;
type StreamPart = StreamResult['stream'] extends ReadableStream<infer Part> ? Part : never;

function applyReasoning(params: CallOptions): CallOptions {
	if (!params.reasoning || params.reasoning === 'provider-default') return params;
	// Explicit options can use a token budget, which must not be combined with effort.
	if (params.providerOptions?.openrouter?.reasoning !== undefined) return params;
	return {
		...params,
		providerOptions: mergeProviderOptions(params.providerOptions, {
			openrouter: { reasoning: { effort: params.reasoning } },
		}),
	};
}

function normalizeUsage(usage: ModelUsage): ModelUsage {
	const { total, cacheRead, cacheWrite } = usage.inputTokens;
	if (total === undefined || cacheWrite === undefined) return usage;
	// The adapter includes cache writes in noCache. Remove them from that count.
	return {
		...usage,
		inputTokens: {
			...usage.inputTokens,
			noCache: Math.max(total - (cacheRead ?? 0) - cacheWrite, 0),
		},
	};
}

/** Adapt generic reasoning and cache usage for the OpenRouter chat adapter. */
export function wrapOpenRouterModel(model: Parameters<typeof AiSdk.wrapLanguageModel>[0]['model']) {
	return loadAi().wrapLanguageModel({
		model,
		middleware: {
			transformParams: async ({ params }) => applyReasoning(params),
			wrapGenerate: async ({ doGenerate }) => {
				const result = await doGenerate();
				return { ...result, usage: normalizeUsage(result.usage) };
			},
			wrapStream: async ({ doStream }) => {
				const result = await doStream();
				return {
					...result,
					stream: result.stream.pipeThrough(
						new TransformStream<StreamPart, StreamPart>({
							transform(chunk, controller) {
								if (chunk.type === 'finish') {
									controller.enqueue({ ...chunk, usage: normalizeUsage(chunk.usage) });
								} else {
									controller.enqueue(chunk);
								}
							},
						}),
					),
				};
			},
		},
	});
}
