/** Adds up the token usage of eval agent calls, so an eval run can report what its own model calls cost. */

import type { ModelGuardrail, TokenUsage } from '@n8n/agents';
import type { InstanceAiEvalLlmUsage } from '@n8n/api-types';
import { AsyncLocalStorage } from 'node:async_hooks';

const currentMeter = new AsyncLocalStorage<EvalUsageMeter>();

export class EvalUsageMeter {
	private readonly usage = new Map<string, InstanceAiEvalLlmUsage>();

	/** Every eval agent call made inside `fn`, at any depth, adds to this meter. */
	async run<T>(fn: () => Promise<T>): Promise<T> {
		return await currentMeter.run(this, fn);
	}

	add(entry: InstanceAiEvalLlmUsage): void {
		const key = JSON.stringify([entry.agent, entry.model]);
		const total = this.usage.get(key);
		if (!total) {
			this.usage.set(key, { ...entry });
			return;
		}
		total.calls += entry.calls;
		total.uncachedInputTokens += entry.uncachedInputTokens;
		total.cacheReadTokens += entry.cacheReadTokens;
		total.cacheWriteTokens += entry.cacheWriteTokens;
		total.outputTokens += entry.outputTokens;
	}

	entries(): InstanceAiEvalLlmUsage[] {
		return [...this.usage.values()].map((entry) => ({ ...entry }));
	}
}

/** Adds usage reported by an eval endpoint to the current meter. Does nothing outside a meter. */
export function recordEvalUsage(entries: InstanceAiEvalLlmUsage[] | undefined): void {
	const meter = currentMeter.getStore();
	if (!meter || !entries) return;
	for (const entry of entries) meter.add(entry);
}

/** Runs `fn` on a new meter and returns the usage it counted. */
export async function meterEvalUsage<T>(
	fn: () => Promise<T>,
): Promise<{ result: T; usage: InstanceAiEvalLlmUsage[] }> {
	const meter = new EvalUsageMeter();
	const result = await meter.run(fn);
	return { result, usage: meter.entries() };
}

function toEvalLlmUsage(agent: string, model: string, usage: TokenUsage): InstanceAiEvalLlmUsage {
	const cacheReadTokens = usage.inputTokenDetails?.cacheRead ?? 0;
	const cacheWriteTokens = usage.inputTokenDetails?.cacheWrite ?? 0;
	return {
		agent,
		model,
		calls: 1,
		// A zero `noCache` is left out of the details, so derive it from the total.
		uncachedInputTokens:
			usage.inputTokenDetails?.noCache ??
			Math.max(usage.promptTokens - cacheReadTokens - cacheWriteTokens, 0),
		cacheReadTokens,
		cacheWriteTokens,
		outputTokens: usage.completionTokens,
	};
}

/** Runs after each model call of the agent named `agent` and adds its usage to the current meter. */
export function evalUsageGuardrail(agent: string): ModelGuardrail {
	return {
		async after(ctx, usage) {
			const meter = currentMeter.getStore();
			if (meter && usage) meter.add(toEvalLlmUsage(agent, ctx.model, usage));
		},
	};
}
