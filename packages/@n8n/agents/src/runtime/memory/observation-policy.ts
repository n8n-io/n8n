import type { ObservationalMemoryConfig } from '../../types';

/** Fraction of the fixed observer threshold at which mid-run observation starts in the background. */
export const FIXED_MID_RUN_SOFT_RATIO = 0.7;
export const DEFAULT_OBSERVATION_CACHE_TTL_MS = 5 * 60_000;
/** Default Observer calls after one turn; each call reads one batch. */
export const DEFAULT_OBSERVER_MAX_BATCHES_AFTER_TURN = 5;
/** Share of the memory window that one Observer batch can fill. */
export const OBSERVER_BATCH_SHARE = 0.6;

/** Shares used when the host sets no fixed threshold. */
export const DEFAULT_OBSERVATION_WINDOW_SHARES = { maxContextWindowTokens: 200_000 } as const;

export const DEFAULT_WINDOW_SHARES = {
	observeAt: 0.2,
	observeNew: 0.1,
	midRunAt: 0.6,
	waitAt: 0.9,
	reflectAt: 0.6,
} as const;

/** Token thresholds the orchestrator compares estimates against. */
export interface ObservationThresholds {
	/** Unobserved tokens that trigger the first observation of a thread. */
	observeFirst: number;
	/** Unobserved tokens that trigger later observations. */
	observeNew: number;
	/** Visible tokens that start a background mid-run observation. */
	midRunSoft: number;
	/** Request tokens at which the loop waits for observation and a new turn resumes from notes. */
	midRunHard: number;
	/** Largest Observer batch, in tokens. Unlimited when the window is unknown. */
	observerBatch: number | undefined;
	/** Active observation-log tokens that trigger the Reflector. */
	reflect: number | undefined;
	source: 'fixed' | 'windowShare';
}

/**
 * The window that memory shares are taken from: the model's window, limited
 * by `maxContextWindowTokens`. The cap alone is used when the model's window
 * is unknown. The model's window stays the provider limit for overrun checks.
 */
export function resolveMemoryWindow(
	config: ObservationalMemoryConfig,
	modelWindowTokens: number | undefined,
): number | undefined {
	const shares = config.windowShares;
	const modelWindow = shares?.contextWindowTokens ?? modelWindowTokens;
	const cap = shares?.maxContextWindowTokens;
	if (cap === undefined || cap <= 0) return modelWindow;
	return modelWindow !== undefined && modelWindow > 0 ? Math.min(modelWindow, cap) : cap;
}

/**
 * Resolve thresholds from the config. Window shares win when the context
 * window is known; the fixed token counts are the fallback.
 */
export function resolveObservationThresholds(
	config: ObservationalMemoryConfig,
	contextWindowTokens: number | undefined,
): ObservationThresholds | undefined {
	const shares = config.windowShares;
	const window = resolveMemoryWindow(config, contextWindowTokens);
	if (shares && window !== undefined && window > 0) {
		const at = (share: number | undefined, fallback: number) =>
			Math.max(1, Math.floor(window * (share ?? fallback)));
		return {
			observeFirst: at(shares.observeAt, DEFAULT_WINDOW_SHARES.observeAt),
			observeNew: at(shares.observeNew, DEFAULT_WINDOW_SHARES.observeNew),
			midRunSoft: at(shares.midRunAt, DEFAULT_WINDOW_SHARES.midRunAt),
			midRunHard: at(shares.waitAt, DEFAULT_WINDOW_SHARES.waitAt),
			observerBatch: at(OBSERVER_BATCH_SHARE, OBSERVER_BATCH_SHARE),
			reflect: config.reflect ? at(shares.reflectAt, DEFAULT_WINDOW_SHARES.reflectAt) : undefined,
			source: 'windowShare',
		};
	}

	const observer = config.observerThresholdTokens;
	if (observer === undefined) return undefined;
	return {
		observeFirst: observer,
		observeNew: observer,
		midRunSoft: Math.max(1, Math.floor(observer * FIXED_MID_RUN_SOFT_RATIO)),
		midRunHard: observer,
		observerBatch:
			window !== undefined && window > 0
				? Math.max(1, Math.floor(window * OBSERVER_BATCH_SHARE))
				: undefined,
		reflect: config.reflectorThresholdTokens,
		source: 'fixed',
	};
}

export type ResumeReason = 'over-limit' | 'cache-cold' | 'model-switch';

/**
 * Decide at the start of a turn whether the thread moves its resume point up
 * to the cursor. Moving it rebuilds the prompt cache and drops detail, so it
 * happens only when the request would not fit the window, or when there is no
 * cache to keep: the thread was idle past the cache lifetime, or it moved to
 * another model. A cold or switched thread resumes only when its request is
 * big enough to be worth it (the first-observation share of the window).
 */
export function decideResume(input: {
	/** Estimated input tokens of the request with the current view. */
	requestTokens: number;
	thresholds: ObservationThresholds;
	/** The largest request memory lets through. */
	windowTokens: number;
	/** Tokens of the observed messages that the current view still replays. */
	replaceableTokens: number;
	now: number;
	lastActivityAt: number | undefined;
	cacheTtlMs: number;
	modelSwitched: boolean;
}): ResumeReason | undefined {
	if (input.requestTokens > input.windowTokens) return 'over-limit';
	if (input.replaceableTokens <= 0) return undefined;
	if (input.requestTokens < input.thresholds.observeFirst) return undefined;
	if (input.modelSwitched) return 'model-switch';
	const idle =
		input.lastActivityAt === undefined || input.now - input.lastActivityAt > input.cacheTtlMs;
	return idle ? 'cache-cold' : undefined;
}

/**
 * Whether a failed or non-advancing Observer call stops observation for the
 * run. With `retry`, the next trigger simply tries again.
 */
export function shouldDisableAfterFailure(config: ObservationalMemoryConfig): boolean {
	return config.failurePolicy === 'disableForRun';
}
