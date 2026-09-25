import type { Logger } from '@n8n/backend-common';

/** LLM-call phases of a mocked eval execution. */
type EvalTimingPhase = 'hints' | 'bypass-pin' | 'http-mock' | 'ai-turn';

const PHASE_ORDER: EvalTimingPhase[] = ['hints', 'bypass-pin', 'http-mock', 'ai-turn'];

interface LlmCallSample {
	phase: EvalTimingPhase;
	durationMs: number;
	label?: string;
}

/**
 * Per-execution LLM-call timing accumulator, gated by
 * `N8N_INSTANCE_AI_EVAL_TIMING=true` (a no-op otherwise).
 */
export class EvalTimings {
	private readonly samples: LlmCallSample[] = [];

	private readonly startedAt = Date.now();

	readonly enabled = process.env.N8N_INSTANCE_AI_EVAL_TIMING === 'true';

	/** Time one mock/hint LLM call and record a sample. Always awaits `fn`. */
	async time<T>(
		phase: EvalTimingPhase,
		label: string | undefined,
		fn: () => Promise<T>,
	): Promise<T> {
		if (!this.enabled) return await fn();
		const start = Date.now();
		try {
			return await fn();
		} finally {
			this.samples.push({ phase, label, durationMs: Date.now() - start });
		}
	}

	/** Log a per-phase + grand-total breakdown. No-op when disabled. */
	summary(logger: Logger): void {
		if (!this.enabled) return;

		for (const phase of PHASE_ORDER) {
			const durations = this.samples.filter((s) => s.phase === phase).map((s) => s.durationMs);
			if (durations.length === 0) continue;
			const total = durations.reduce((sum, d) => sum + d, 0);
			logger.info(
				`[EvalMock][timing] phase=${phase} calls=${durations.length} total=${fmt(total)} p50=${fmt(percentile(durations, 50))} max=${fmt(Math.max(...durations))}`,
			);
		}

		const llmTotal = this.samples.reduce((sum, s) => sum + s.durationMs, 0);
		// Display-only; mirrors getModelId() in eval-agents.ts (SONNET_MODEL default).
		const model =
			process.env.N8N_INSTANCE_AI_EVAL_MODEL ??
			process.env.N8N_INSTANCE_AI_MODEL ??
			'anthropic/claude-sonnet-4-6';
		logger.info(
			`[EvalMock][timing] SUMMARY wall=${fmt(Date.now() - this.startedAt)} llmCalls=${this.samples.length} llmTotal=${fmt(llmTotal)} model=${model}`,
		);
	}
}

function fmt(ms: number): string {
	return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function percentile(values: number[], p: number): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
	return sorted[index];
}
