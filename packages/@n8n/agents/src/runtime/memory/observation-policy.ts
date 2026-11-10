import type { ObservationalMemoryConfig, ObservationWindowShares } from '../../types';

/**
 * Every observational-memory default in one place. `resolveObservationalMemoryConfig`
 * fills unset options from here; the runtime reads only resolved values.
 */
export const DEFAULT_MEMORY_POLICY = {
	/** Shares of the memory window. */
	windowShares: {
		observeAt: 0.2,
		observeNew: 0.1,
		midRunAt: 0.6,
		waitAt: 0.9,
		reflectAt: 0.6,
		batchAt: 0.6,
	},
	/** Memory starts early on very large windows. */
	maxContextWindowTokens: 200_000,
	/** Share of a fixed Observer threshold that starts a background mid-run observation. */
	fixedMidRunShare: 0.7,
	/** Used when the provider's cache retention is unknown. */
	cacheTtlMs: 5 * 60_000,
	logPlacement: 'message',
	failurePolicy: 'retry',
	maxObserverBatchesAfterTurn: 5,
	maxConsecutiveObserverFailures: 3,
	historyRecall: true,
} as const satisfies {
	windowShares: Required<
		Omit<ObservationWindowShares, 'contextWindowTokens' | 'maxContextWindowTokens'>
	>;
	[key: string]: unknown;
};

/** Token thresholds the orchestrator compares estimates against. */
export interface ObservationThresholds {
	/** Unobserved tokens that trigger the first observation of a thread. */
	observeFirst: number;
	/** Unobserved tokens that trigger later observations. */
	observeNew: number;
	/** Request tokens that start a background mid-run observation. */
	midRunSoft: number;
	/** Request tokens at which the loop waits for observation. */
	midRunHard: number;
	/** Largest Observer batch, in tokens. Unlimited when the window is unknown. */
	observerBatch: number | undefined;
	/** Active observation-log tokens that trigger the Reflector. */
	reflect: number | undefined;
}

/**
 * The limits of one runtime, resolved once from the config and the model's
 * window. The model window is the provider limit. The memory window (model
 * window or cap, whichever is smaller) is what the shares are taken from.
 */
export class MemoryBudget {
	private constructor(
		readonly thresholds: ObservationThresholds,
		readonly modelWindow: number | undefined,
		private readonly memoryWindow: number | undefined,
	) {}

	static resolve(
		config: ObservationalMemoryConfig,
		modelWindowTokens: number | undefined,
	): MemoryBudget | undefined {
		const shares = config.windowShares;
		const modelWindow = positive(shares?.contextWindowTokens ?? modelWindowTokens);
		const memoryWindow = resolveMemoryWindow(shares, modelWindow);
		const thresholds =
			shares && memoryWindow
				? shareThresholds(config, shares, memoryWindow)
				: fixedThresholds(config, memoryWindow);
		if (!thresholds) return undefined;
		return new MemoryBudget(thresholds, modelWindow, shares ? memoryWindow : undefined);
	}

	/** Request size at which the loop blocks. Never above the model's window. */
	get hardLimit(): number {
		const { midRunHard } = this.thresholds;
		return this.modelWindow ? Math.min(midRunHard, this.modelWindow) : midRunHard;
	}

	/** Largest request memory lets through before a turn resumes from notes. */
	get requestLimit(): number {
		return this.memoryWindow ?? this.hardLimit;
	}

	isOverModelWindow(requestTokens: number): boolean {
		return this.modelWindow !== undefined && requestTokens >= this.modelWindow;
	}
}

function positive(value: number | undefined): number | undefined {
	return value !== undefined && value > 0 ? value : undefined;
}

/** The model's window, limited by `maxContextWindowTokens`; the cap alone when the window is unknown. */
export function resolveMemoryWindow(
	shares: ObservationWindowShares | undefined,
	modelWindow: number | undefined,
): number | undefined {
	const cap = positive(shares?.maxContextWindowTokens);
	if (!cap) return modelWindow;
	return modelWindow ? Math.min(modelWindow, cap) : cap;
}

function shareThresholds(
	config: ObservationalMemoryConfig,
	shares: ObservationWindowShares,
	window: number,
): ObservationThresholds {
	const defaults = DEFAULT_MEMORY_POLICY.windowShares;
	const at = (share: number | undefined, fallback: number) =>
		Math.max(1, Math.floor(window * (share ?? fallback)));
	return {
		observeFirst: at(shares.observeAt, defaults.observeAt),
		observeNew: at(shares.observeNew, defaults.observeNew),
		midRunSoft: at(shares.midRunAt, defaults.midRunAt),
		midRunHard: at(shares.waitAt, defaults.waitAt),
		observerBatch: at(shares.batchAt, defaults.batchAt),
		reflect: config.reflect ? at(shares.reflectAt, defaults.reflectAt) : undefined,
	};
}

function fixedThresholds(
	config: ObservationalMemoryConfig,
	window: number | undefined,
): ObservationThresholds | undefined {
	const observer = config.observerThresholdTokens;
	if (observer === undefined) return undefined;
	return {
		observeFirst: observer,
		observeNew: observer,
		midRunSoft: Math.max(1, Math.floor(observer * DEFAULT_MEMORY_POLICY.fixedMidRunShare)),
		midRunHard: observer,
		observerBatch: window
			? Math.max(1, Math.floor(window * DEFAULT_MEMORY_POLICY.windowShares.batchAt))
			: undefined,
		reflect: config.reflectorThresholdTokens,
	};
}

export type ResumeReason = 'over-limit' | 'cache-cold' | 'model-switch';

/**
 * Decide at the start of a turn whether the thread moves its resume point up
 * to the cursor. Moving it rebuilds the prompt cache and drops detail, so it
 * happens only when the request would not fit, or when there is no cache to
 * keep: the thread was idle past the cache lifetime, or it moved to another
 * model. A cold or switched thread resumes only when its request is big
 * enough to be worth it (the first-observation threshold).
 */
export function decideResume(input: {
	/** Estimated input tokens of the request with the current view. */
	requestTokens: number;
	budget: MemoryBudget;
	/** Tokens of the observed messages that the current view still replays. */
	replaceableTokens: number;
	now: number;
	lastActivityAt: number | undefined;
	cacheTtlMs: number;
	modelSwitched: boolean;
}): ResumeReason | undefined {
	if (input.requestTokens > input.budget.requestLimit) return 'over-limit';
	if (input.replaceableTokens <= 0) return undefined;
	if (input.requestTokens < input.budget.thresholds.observeFirst) return undefined;
	if (input.modelSwitched) return 'model-switch';
	const idle =
		input.lastActivityAt === undefined || input.now - input.lastActivityAt > input.cacheTtlMs;
	return idle ? 'cache-cold' : undefined;
}

/**
 * Whether Observer failures stop observation for the rest of the run.
 * `disableForRun` stops at the first failure; `retry` stops after a few in a row.
 */
export function shouldStopObserving(
	config: ObservationalMemoryConfig,
	consecutiveFailures: number,
): boolean {
	if (consecutiveFailures <= 0) return false;
	if (config.failurePolicy === 'disableForRun') return true;
	return (
		consecutiveFailures >=
		(config.maxConsecutiveObserverFailures ?? DEFAULT_MEMORY_POLICY.maxConsecutiveObserverFailures)
	);
}
