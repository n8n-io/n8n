import type { PreferenceMiningCall, PreferenceMiningMetrics } from '@n8n/api-types';

export function emptyMetrics(): PreferenceMiningMetrics {
	return {
		modelCalls: 0,
		inputTokens: 0,
		outputTokens: 0,
		cachedInputTokens: 0,
		cacheWriteInputTokens: 0,
		elapsedMs: 0,
		estimatedCost: 0,
		knownCost: 0,
		usageComplete: true,
		calls: [],
	};
}

export function sumMiningMetrics(sources: PreferenceMiningMetrics[]): PreferenceMiningMetrics {
	const total = emptyMetrics();
	for (const source of sources) {
		total.modelCalls += source.modelCalls;
		total.inputTokens += source.inputTokens;
		total.outputTokens += source.outputTokens;
		total.cachedInputTokens += source.cachedInputTokens;
		total.cacheWriteInputTokens =
			(total.cacheWriteInputTokens ?? 0) + (source.cacheWriteInputTokens ?? 0);
		total.elapsedMs += source.elapsedMs;
		total.knownCost = (total.knownCost ?? 0) + (source.knownCost ?? source.estimatedCost ?? 0);
		total.usageComplete &&= source.usageComplete ?? source.modelCalls === 0;
		total.estimatedCost =
			total.estimatedCost !== null && source.estimatedCost !== null
				? total.estimatedCost + source.estimatedCost
				: null;
		total.calls?.push(...(source.calls ?? []));
	}
	return total;
}

export function metricsFromCalls(calls: PreferenceMiningCall[]): PreferenceMiningMetrics {
	return sumMiningMetrics(
		calls.map((call) => ({
			modelCalls: 1,
			inputTokens: call.inputTokens ?? 0,
			outputTokens: call.outputTokens ?? 0,
			cachedInputTokens: call.cachedInputTokens ?? 0,
			cacheWriteInputTokens: call.cacheWriteInputTokens ?? 0,
			elapsedMs: call.elapsedMs,
			estimatedCost: call.usageComplete ? call.estimatedCost : null,
			knownCost: call.estimatedCost ?? 0,
			usageComplete: call.usageComplete,
			calls: [call],
		})),
	);
}
