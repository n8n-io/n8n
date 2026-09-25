import type { ModelConfig, TokenUsage } from '@n8n/agents';
import type { PreferenceMiningCall, PreferenceMiningPricing } from '@n8n/api-types';
import type { OutboundHttp } from '@n8n/backend-network';
import { jsonParse, OperationalError } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import type { z } from 'zod';

import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';
import { metricsFromCalls } from '../workflow-index/preference-mining/lab-metrics';

import {
	consolidationSchema,
	extractionSchema,
	reflectionSchema,
	type LabModel,
	type MemoryHelpers,
} from '../workflow-index/preference-mining/lab-types';

export const MINING_CALL_TIMEOUT_MS = 180_000;

export async function createMiningModel(
	config: ModelConfig,
	outboundHttp: OutboundHttp,
	signal: AbortSignal,
	pricing?: PreferenceMiningPricing,
	maxOutputTokens = 16384,
): Promise<LabModel> {
	const { Agent, mergeUsage, toTokenUsage } = await import('@n8n/agents');
	const { computeCost } = await import('@n8n/agents/catalog');
	const { NoObjectGeneratedError } = await import('ai');
	const calls: PreferenceMiningCall[] = [];
	async function call<T>(
		stage: PreferenceMiningCall['stage'],
		instruction: string,
		data: unknown,
		schema: z.ZodType<T>,
		sourceId?: string,
	): Promise<T> {
		signal.throwIfAborted();
		const started = performance.now();
		const callSignal = AbortSignal.any([signal, AbortSignal.timeout(MINING_CALL_TIMEOUT_MS)]);
		const input = JSON.stringify(data);
		const record: PreferenceMiningCall = {
			stage,
			sourceId,
			requestHash: createHash('sha256').update(instruction).update(input).digest('hex'),
			requestCharacters: instruction.length + input.length,
			status: 'failed',
			finishReason: null,
			failure: null,
			usageSource: 'missing',
			usageComplete: false,
			inputTokens: null,
			outputTokens: null,
			cachedInputTokens: null,
			cacheWriteInputTokens: null,
			estimatedCost: null,
			elapsedMs: 0,
		};
		calls.push(record);
		let usage: TokenUsage | undefined;
		let steps: TokenUsage | undefined;
		let lastResponseId: string | undefined;
		function captureError(error: unknown) {
			if (!NoObjectGeneratedError.isInstance(error)) return;
			record.finishReason = error.finishReason ?? record.finishReason;
			record.failure = error.finishReason === 'length' ? 'output-limit' : 'invalid-output';
			const parsed = schema.safeParse(
				jsonParse<unknown>(error.text ?? '', { fallbackValue: null }),
			);
			if (!parsed.success) {
				record.validationIssues = parsed.error.issues.map((issue) => ({
					path: issue.path.map(String).join('.'),
					code: issue.code,
				}));
			}
			const errorUsage =
				error.usage?.inputTokens !== undefined && error.usage.outputTokens !== undefined
					? toTokenUsage(error.usage)
					: undefined;
			if (!errorUsage) return;
			if (!steps) {
				usage = errorUsage;
				record.usageSource = 'error';
				record.usageComplete = true;
			} else if (lastResponseId && error.response?.id) {
				// The error can repeat the usage already delivered by the step callback.
				usage = lastResponseId === error.response.id ? steps : mergeUsage(steps, errorUsage);
				record.usageSource = 'steps';
				record.usageComplete = true;
			}
		}
		const agent = new Agent('preference-mining')
			.model(config)
			.modelFetch(createAiProxyFetch(outboundHttp))
			.instructions(instruction)
			.structuredOutput(schema);
		try {
			const result = await agent.generate(input, {
				abortSignal: callSignal,
				maxIterations: 1,
				maxOutputTokens,
				onStepEnd: (step) => {
					if (step.usage.inputTokens === undefined || step.usage.outputTokens === undefined) return;
					steps = mergeUsage(steps, toTokenUsage(step.usage, step.providerMetadata));
					lastResponseId = step.response.id;
					record.finishReason = step.finishReason;
				},
			});
			usage = result.usage ?? steps;
			record.usageSource = result.usage ? 'result' : steps ? 'steps' : 'missing';
			record.usageComplete = !!usage && result.finishReason !== 'error';
			record.finishReason =
				result.finishReason === 'error' ? record.finishReason : (result.finishReason ?? null);
			if (result.error || result.finishReason === 'error' || callSignal.aborted) {
				captureError(result.error);
				throw new OperationalError('Preference extraction did not complete.');
			}
			const parsed = schema.safeParse(result.structuredOutput);
			if (!parsed.success) {
				record.failure = 'invalid-output';
				record.validationIssues = parsed.error.issues.map((issue) => ({
					path: issue.path.map(String).join('.'),
					code: issue.code,
				}));
				throw new OperationalError('The preference response did not match the expected format.');
			}
			record.status = 'complete';
			return parsed.data;
		} catch (error) {
			usage ??= steps;
			if (usage && record.usageSource === 'missing') record.usageSource = 'steps';
			captureError(error);
			record.failure ??= signal.aborted
				? 'cancelled'
				: callSignal.aborted
					? 'timeout'
					: record.finishReason === 'length'
						? 'output-limit'
						: 'provider-error';
			throw error;
		} finally {
			if (usage) {
				record.inputTokens = usage.promptTokens;
				record.outputTokens = usage.completionTokens;
				record.cachedInputTokens = usage.inputTokenDetails?.cacheRead ?? 0;
				record.cacheWriteInputTokens = usage.inputTokenDetails?.cacheWrite ?? 0;
				record.estimatedCost = usage.cost ?? (pricing ? computeCost(usage, pricing) : null);
			}
			record.elapsedMs = Math.round(performance.now() - started);
			await agent.close();
		}
	}
	async function withRetry<T>(
		stage: PreferenceMiningCall['stage'],
		instruction: string,
		data: unknown,
		schema: z.ZodType<T>,
		sourceId?: string,
	): Promise<T> {
		try {
			return await call(stage, instruction, data, schema, sourceId);
		} catch (error) {
			const failure = calls.at(-1)?.failure;
			if (
				signal.aborted ||
				(failure !== 'timeout' && failure !== 'provider-error' && failure !== 'invalid-output')
			) {
				throw error;
			}
			// Retry only the failed request. Completed extraction and usage stay intact.
			return await call(stage, instruction, data, schema, sourceId);
		}
	}
	return {
		extract: async (instruction, data, sourceId) =>
			await withRetry('extract', instruction, data, extractionSchema, sourceId),
		consolidate: async (instruction, data, sourceId) =>
			await withRetry('consolidate', instruction, data, consolidationSchema, sourceId),
		reflect: async (instruction, data, sourceId) =>
			await withRetry('reflect', instruction, data, reflectionSchema, sourceId),
		metrics: () => metricsFromCalls(calls),
	};
}

export async function loadMiningMemory(): Promise<MemoryHelpers> {
	const {
		hashEpisodicMemoryContent,
		rankEpisodicMemoryEntries,
		DEFAULT_EPISODIC_MEMORY_CAPTURE_TOOL_INSTRUCTION,
		DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT,
	} = await import('@n8n/agents');
	return {
		hash: hashEpisodicMemoryContent,
		captureInstruction: DEFAULT_EPISODIC_MEMORY_CAPTURE_TOOL_INSTRUCTION,
		reflectionInstruction: DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT,
		recall(preferences, query, topK) {
			// Equal dates keep inferred observation times out of the ranking.
			const date = new Date(0);
			return rankEpisodicMemoryEntries(
				preferences.map((p) => ({
					id: p.id,
					resourceId: p.projectId,
					content: p.content,
					contentHash: hashEpisodicMemoryContent(p.content),
					status: 'active',
					supersededBy: null,
					createdAt: date,
					updatedAt: date,
					lastSeenAt: date,
				})),
				query,
				{ topK },
			).map((entry) => entry.id);
		},
	};
}
