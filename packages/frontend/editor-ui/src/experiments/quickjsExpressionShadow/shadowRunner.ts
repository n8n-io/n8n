import type {
	ExpressionEvaluationOutcome,
	ExpressionShadowContext,
	ExpressionShadowRunner,
	ShadowEvaluator,
} from 'n8n-workflow';

import { canonicalize, expressionSkeleton, isNonDeterministic, valueType } from './compare';

export const LATENCY_BUCKET_BOUNDS_MS = [0.1, 0.5, 1, 2, 5, 10, 25, 50, 100];

export const MAX_MISMATCH_SHAPES = 20;

export type ShadowOutcome =
	| 'same'
	| 'different'
	| 'unchecked'
	| 'legacy_ok_quickjs_error'
	| 'legacy_error_quickjs_ok'
	| 'both_error';

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
});

const emptyBuckets = () => new Array<number>(LATENCY_BUCKET_BOUNDS_MS.length + 1).fill(0);

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
		const evaluations = Object.values(this.counts).reduce((sum, count) => sum + count, 0);
		if (evaluations === 0) return undefined;

		const report: ShadowReport = {
			...this.counts,
			evaluations,
			legacy_latency_buckets: this.legacyLatency,
			quickjs_latency_buckets: this.quickjsLatency,
			mismatches: [...this.mismatches.values()],
		};
		this.counts = emptyCounts();
		this.legacyLatency = emptyBuckets();
		this.quickjsLatency = emptyBuckets();
		this.mismatches = new Map();
		return report;
	}

	private record(
		source: string,
		legacy: ExpressionEvaluationOutcome,
		quickjs: ExpressionEvaluationOutcome,
		legacyMs: number,
		quickjsMs: number,
	) {
		const outcome = this.classify(source, legacy, quickjs);
		this.counts[outcome] += 1;
		this.legacyLatency[bucketIndex(legacyMs)] += 1;
		this.quickjsLatency[bucketIndex(quickjsMs)] += 1;

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
