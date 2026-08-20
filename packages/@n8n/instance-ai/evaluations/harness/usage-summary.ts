import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import type { TranscriptTurn } from '../types';

/**
 * Cache-aware token totals for one build, summed from its captured run debug.
 *
 * Context management is a quality-per-token tradeoff: an agent with weaker memory
 * can compensate by re-reading instance state, which in some cases is the *desired*
 * behaviour. Two memory approaches can therefore tie on pass rate while differing
 * sharply in what they spent, and that difference only shows up here.
 *
 * Cache reads are split out rather than folded into input because they are an order
 * of magnitude cheaper — summing them together would hide the effect a memory change
 * has on cache hit rate, which is usually the largest cost term.
 */
export interface BuildUsageSummary {
	uncachedInput: number;
	cacheRead: number;
	cacheWrite: number;
	output: number;
	/** Provider-reported total where present. Not derived from the fields above:
	 *  providers count cache tokens inconsistently, so a computed total would
	 *  disagree with billing. */
	totalTokens: number;
	/** LLM steps the totals were summed over — 0 means nothing was captured. */
	steps: number;
}

/** First finite number among `keys`, or undefined when none is present. Distinguishing
 *  absent from zero matters: a provider reporting 0 non-cached tokens is authoritative,
 *  whereas omitting the field means we have to derive it. */
function optionalNumberAt(source: Record<string, unknown>, ...keys: string[]): number | undefined {
	for (const key of keys) {
		const value = source[key];
		if (typeof value === 'number' && Number.isFinite(value)) return value;
	}
	return undefined;
}

function numberAt(source: Record<string, unknown>, ...keys: string[]): number {
	return optionalNumberAt(source, ...keys) ?? 0;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

/**
 * Sum a thread's per-step token usage.
 *
 * `step.output` is a passthrough of the SDK's step-end event, so in practice `usage`
 * arrives as the AI SDK's `LanguageModelUsage` — `inputTokenDetails.noCacheTokens` and
 * friends. The other spellings read here (`noCache`/`cacheRead`/`cacheWrite` from the
 * runtime finish chunk in `UsageAccumulator`, and `promptTokens`/`completionTokens`
 * from the older naming `parseUsageSummary` still accepts) are not produced at this
 * call site today; they are cheap insurance because those shapes do exist elsewhere in
 * the repo and the capture path is a plain record passthrough. The failure mode being
 * guarded is silent zeros for a whole arm, which reads as a free memory approach rather
 * than as a field that moved.
 */
export function summarizeBuildUsage(
	runDebug: InstanceAiRunDebugResponse[] | undefined,
): BuildUsageSummary | undefined {
	if (!runDebug || runDebug.length === 0) return undefined;

	const totals: BuildUsageSummary = {
		uncachedInput: 0,
		cacheRead: 0,
		cacheWrite: 0,
		output: 0,
		totalTokens: 0,
		steps: 0,
	};

	for (const run of runDebug) {
		for (const step of run.steps ?? []) {
			const usage = asRecord(step.output?.usage);
			if (!usage) continue;
			totals.steps++;

			const details = asRecord(usage.inputTokenDetails);
			const inputTokens = numberAt(usage, 'inputTokens', 'promptTokens');
			if (details) {
				const noCache = optionalNumberAt(details, 'noCacheTokens', 'noCache');
				const cacheRead = numberAt(details, 'cacheReadTokens', 'cacheRead');
				const cacheWrite = numberAt(
					details,
					'cacheWriteTokens',
					'cacheWrite',
					'cacheCreationTokens',
				);
				totals.cacheRead += cacheRead;
				totals.cacheWrite += cacheWrite;
				// A reported non-cached count wins, including a reported zero. Only when the
				// provider omits it do we derive it from the total, so the three parts stay
				// comparable across arms instead of collapsing to zero on those providers.
				totals.uncachedInput += noCache ?? Math.max(0, inputTokens - cacheRead - cacheWrite);
			} else {
				totals.uncachedInput += inputTokens;
			}

			totals.output += numberAt(usage, 'outputTokens', 'completionTokens');
			totals.totalTokens += numberAt(usage, 'totalTokens');
		}
	}

	// Every step lacked a usage record: report nothing rather than a row of zeros
	// that reads as a genuinely free build.
	return totals.steps === 0 ? undefined : totals;
}

/**
 * Tool calls the evaluated run actually made. A memory change that cuts re-reads of
 * instance state shows up here before it shows up in tokens.
 *
 * Counts every non-narration step, not just `kind: 'tool-call'`. Several tools render
 * as their own step kind and never fall through to `tool-call` — a `create-tasks` call
 * becomes `kind: 'plan'` and an `ask-user` call becomes `kind: 'ask-user'` (see
 * `outcome/transcript-from-events.ts`) — so filtering on `tool-call` alone silently
 * drops orchestration calls that most multi-step conversations make. This matches
 * `seededTurnCounters` in `outcome/event-parser.ts`, which is what produces the
 * `toolCallCount` the harness already reports per turn; the two numbers appear in the
 * same artifact and would be read against each other, so they must mean the same thing.
 *
 * Seeded turns are excluded: they are restored prior context, not work this run did,
 * so counting them would charge every seeded case for its own fixture — and the
 * seeded cases are exactly the ones a memory comparison leans on.
 */
export function totalToolCalls(transcript: TranscriptTurn[] | undefined): number | undefined {
	if (!transcript) return undefined;
	let count = 0;
	for (const turn of transcript) {
		if (turn.seeded) continue;
		for (const step of turn.steps) {
			if (step.kind !== 'agent-text') count++;
		}
	}
	return count;
}
