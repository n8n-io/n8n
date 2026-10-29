import type {
	ExpressionEvaluationOutcome,
	ExpressionShadowContext,
	ExpressionShadowRunner,
	ShadowEvaluator,
} from 'n8n-workflow';

import { getResolvableState } from '@/app/utils/expressions';

import { canonicalize, expressionSkeleton, isNonDeterministic, valueType } from './compare';

export const LATENCY_BUCKET_BOUNDS_MS = [0.1, 0.5, 1, 2, 5, 10, 25, 50, 100];

export const MAX_MISMATCH_SHAPES = 20;

// Bounds the memory that remembers which expressions a report already counted.
// Past it, new expressions are not counted, so each count stays at one per expression.
const MAX_TRACKED_EXPRESSIONS = 5000;

export type ShadowOutcome =
	| 'same'
	| 'different'
	| 'unchecked'
	| 'legacy_ok_quickjs_error'
	| 'legacy_error_quickjs_ok'
	| 'both_error'
	| 'legacy_missing_input';

/**
 * Before the previous nodes run, the legacy engine throws for the missing input
 * data and the editor shows a "pending" hint, while QuickJS reads `undefined`.
 * Users open nodes like this all the time, so these runs get their own count
 * instead of filling the capped mismatch shapes. When QuickJS still returns a
 * value (for example from `?? 'fallback'`), the user would see a difference, so
 * that run stays a mismatch.
 */
function isMissingInput(
	legacy: ExpressionEvaluationOutcome,
	quickjs: ExpressionEvaluationOutcome,
): boolean {
	if (legacy.ok || getResolvableState(legacy.error) !== 'pending') return false;
	return !quickjs.ok || quickjs.value === undefined;
}

type MismatchOutcome = Extract<
	ShadowOutcome,
	'different' | 'legacy_ok_quickjs_error' | 'legacy_error_quickjs_ok'
>;

export interface MismatchShape {
	outcome: MismatchOutcome;
	skeleton: string;
	legacy_type: string;
	quickjs_type: string;
	error_class?: string;
	count: number;
}

export type ShadowReport = Record<ShadowOutcome, number> & {
	evaluations: number;
	quickjs_timeouts: number;
	legacy_latency_buckets: number[];
	quickjs_latency_buckets: number[];
	mismatches: MismatchShape[];
};

interface ShadowRunnerOptions {
	evaluator: Pick<ShadowEvaluator, 'evaluate'>;
	/** One in this many legacy evaluations also runs in QuickJS. */
	sampleRate: number;
	random?: () => number;
	now?: () => number;
}

const emptyCounts = (): Record<ShadowOutcome, number> => ({
	same: 0,
	different: 0,
	unchecked: 0,
	legacy_ok_quickjs_error: 0,
	legacy_error_quickjs_ok: 0,
	both_error: 0,
	legacy_missing_input: 0,
});

const emptyBuckets = () => new Array<number>(LATENCY_BUCKET_BOUNDS_MS.length + 1).fill(0);

/** A report with nothing in it, for a run that never started. */
export function emptyReport(): ShadowReport {
	return {
		...emptyCounts(),
		evaluations: 0,
		quickjs_timeouts: 0,
		legacy_latency_buckets: emptyBuckets(),
		quickjs_latency_buckets: emptyBuckets(),
		mismatches: [],
	};
}

function bucketIndex(durationMs: number): number {
	const index = LATENCY_BUCKET_BOUNDS_MS.findIndex((bound) => durationMs <= bound);
	return index === -1 ? LATENCY_BUCKET_BOUNDS_MS.length : index;
}

function isMismatch(outcome: ShadowOutcome): outcome is MismatchOutcome {
	return (
		outcome === 'different' ||
		outcome === 'legacy_ok_quickjs_error' ||
		outcome === 'legacy_error_quickjs_ok'
	);
}

/**
 * Evaluates a sample of expressions with QuickJS before the legacy engine runs
 * them, and counts how the two outcomes compare. QuickJS runs first because it
 * works on copies of the data, so an expression that changes the data in place
 * (such as `.reverse()`) cannot skew the comparison.
 */
export class QuickJsExpressionShadow implements ExpressionShadowRunner {
	private readonly evaluator: Pick<ShadowEvaluator, 'evaluate'>;

	private readonly sampleRate: number;

	private readonly random: () => number;

	private readonly now: () => number;

	// Set while a sampled expression runs in either engine. Nested evaluations
	// (a parameter that reads another parameter) are part of that run.
	private running = false;

	private counts = emptyCounts();

	private timeouts = 0;

	// Every recorded run, so a report with only missing-input runs is still sent.
	private runs = 0;

	// The editor evaluates the same expression on every render and keystroke, so
	// the outcome counts take each expression once per report.
	private counted = new Set<string>();

	// Kept apart from `counted`, so the same expression is still compared once
	// its input data arrives in the same report window.
	private countedMissingInput = new Set<string>();

	// Every distinct expression in either set. The budget counts an expression
	// once, also when it first had no input data and then was compared.
	private tracked = new Set<string>();

	private legacyLatency = emptyBuckets();

	private quickjsLatency = emptyBuckets();

	private mismatches = new Map<string, MismatchShape>();

	constructor(options: ShadowRunnerOptions) {
		this.evaluator = options.evaluator;
		this.sampleRate = options.sampleRate;
		this.random = options.random ?? Math.random;
		this.now = options.now ?? (() => performance.now());
	}

	beforeLegacy({ expression, source, data, timezone }: ExpressionShadowContext) {
		if (this.running) return undefined;
		if (this.random() * this.sampleRate >= 1) return undefined;

		this.running = true;
		const quickjsStart = this.now();
		let quickjs: ExpressionEvaluationOutcome;
		try {
			quickjs = this.evaluator.evaluate(expression, data, timezone);
		} catch (error) {
			this.running = false;
			throw error;
		}
		const quickjsMs = this.now() - quickjsStart;

		const legacyStart = this.now();
		return (legacy: ExpressionEvaluationOutcome) => {
			const legacyMs = this.now() - legacyStart;
			this.running = false;
			this.record(source, legacy, quickjs, legacyMs, quickjsMs);
		};
	}

	/** The counts since the last report, or `undefined` when nothing ran. Resets the counts. */
	takeReport(): ShadowReport | undefined {
		if (this.runs === 0) return undefined;

		const total = Object.values(this.counts).reduce((sum, count) => sum + count, 0);
		const report: ShadowReport = {
			...this.counts,
			// Missing-input runs are not compared, so they stay out of `evaluations`.
			evaluations: total - this.counts.legacy_missing_input,
			quickjs_timeouts: this.timeouts,
			legacy_latency_buckets: this.legacyLatency,
			quickjs_latency_buckets: this.quickjsLatency,
			mismatches: [...this.mismatches.values()],
		};
		this.counts = emptyCounts();
		this.timeouts = 0;
		this.runs = 0;
		this.counted = new Set();
		this.countedMissingInput = new Set();
		this.tracked = new Set();
		this.legacyLatency = emptyBuckets();
		this.quickjsLatency = emptyBuckets();
		this.mismatches = new Map();
		return report;
	}

	private record(
		source: string,
		legacyResult: ExpressionEvaluationOutcome,
		quickjs: ExpressionEvaluationOutcome,
		legacyMs: number,
		quickjsMs: number,
	) {
		this.runs += 1;
		// A timeout depends on the run, so every run counts.
		if (!quickjs.ok && quickjs.errorClass === 'timeout') this.timeouts += 1;

		const overBudget = !this.tracked.has(source) && this.tracked.size >= MAX_TRACKED_EXPRESSIONS;
		if (isMissingInput(legacyResult, quickjs)) {
			// Not compared, so it stays out of the latency buckets too: the legacy
			// engine fails at once, which would make it look faster.
			if (this.countedMissingInput.has(source) || overBudget) return;
			this.countedMissingInput.add(source);
			this.tracked.add(source);
			this.counts.legacy_missing_input += 1;
			return;
		}

		// Like a timeout, latency depends on the run, so every compared run counts.
		this.legacyLatency[bucketIndex(legacyMs)] += 1;
		this.quickjsLatency[bucketIndex(quickjsMs)] += 1;

		if (this.counted.has(source) || overBudget) return;
		this.counted.add(source);
		this.tracked.add(source);

		// A function result reaches the user as an error ("please add ()"), and
		// QuickJS cannot return a function, so it counts as an error on both sides.
		const legacy: ExpressionEvaluationOutcome =
			legacyResult.ok && typeof legacyResult.value === 'function'
				? { ok: false, error: legacyResult.value, errorClass: 'function' }
				: legacyResult;

		const outcome = this.classify(source, legacy, quickjs);
		this.counts[outcome] += 1;

		if (!isMismatch(outcome)) return;

		const shape: Omit<MismatchShape, 'count'> = {
			outcome,
			skeleton: expressionSkeleton(source),
			legacy_type: legacy.ok ? valueType(legacy.value) : 'error',
			quickjs_type: quickjs.ok ? valueType(quickjs.value) : 'error',
			error_class: !quickjs.ok ? quickjs.errorClass : !legacy.ok ? legacy.errorClass : undefined,
		};
		const key = JSON.stringify(shape);
		const existing = this.mismatches.get(key);
		if (existing) {
			existing.count += 1;
		} else if (this.mismatches.size < MAX_MISMATCH_SHAPES) {
			this.mismatches.set(key, { ...shape, count: 1 });
		}
	}

	private classify(
		source: string,
		legacy: ExpressionEvaluationOutcome,
		quickjs: ExpressionEvaluationOutcome,
	): ShadowOutcome {
		if (!legacy.ok) return quickjs.ok ? 'legacy_error_quickjs_ok' : 'both_error';
		if (!quickjs.ok) return 'legacy_ok_quickjs_error';
		if (isNonDeterministic(source)) return 'unchecked';

		let legacyValue: string | undefined;
		let quickjsValue: string | undefined;
		try {
			legacyValue = canonicalize(legacy.value);
			quickjsValue = canonicalize(quickjs.value);
		} catch {
			// A getter on the value threw; there is nothing reliable to compare.
			return 'unchecked';
		}
		if (legacyValue === undefined || quickjsValue === undefined) return 'unchecked';
		return legacyValue === quickjsValue ? 'same' : 'different';
	}
}
