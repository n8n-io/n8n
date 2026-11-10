import type { ObservationalMemoryConfig } from '../../types';

/** Fraction of the fixed observer threshold at which mid-run observation starts in the background. */
export const FIXED_MID_RUN_SOFT_RATIO = 0.7;
export const DEFAULT_OBSERVATION_CACHE_TTL_MS = 5 * 60_000;

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
	/** Visible tokens at which the loop waits for observation. */
	midRunHard: number;
	/**
	 * Visible tokens above which `cacheAware` drops observed messages. It is the
	 * `waitAt` share of the context window when the window is known, so a warm
	 * cache keeps full history well past the fixed observer threshold.
	 */
	replayLimit: number;
	/** Active observation-log tokens that trigger the Reflector. */
	reflect: number | undefined;
	source: 'fixed' | 'windowShare';
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
	const window = shares?.contextWindowTokens ?? contextWindowTokens;
	if (shares && window !== undefined && window > 0) {
		const at = (share: number | undefined, fallback: number) =>
			Math.max(1, Math.floor(window * (share ?? fallback)));
		const midRunHard = at(shares.waitAt, DEFAULT_WINDOW_SHARES.waitAt);
		return {
			observeFirst: at(shares.observeAt, DEFAULT_WINDOW_SHARES.observeAt),
			observeNew: at(shares.observeNew, DEFAULT_WINDOW_SHARES.observeNew),
			midRunSoft: at(shares.midRunAt, DEFAULT_WINDOW_SHARES.midRunAt),
			midRunHard,
			replayLimit: midRunHard,
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
		// Fixed thresholds observe at `observer`, so a limit equal to it would
		// never replay full history. Use the window when it is known; it also
		// caps the limit, so a large `observer` cannot overfill the context.
		replayLimit:
			window !== undefined && window > 0
				? Math.max(1, Math.floor(window * DEFAULT_WINDOW_SHARES.waitAt))
				: observer,
		reflect: config.reflectorThresholdTokens,
		source: 'fixed',
	};
}

export type HistoryReplay =
	| { kind: 'full' }
	| { kind: 'sinceCursor'; reason: 'masked-mode' | 'cache-cold' | 'over-limit' };

/**
 * Decide whether a turn replays the full history or only the messages after
 * the observation cursor. `cacheAware` keeps detail while the provider cache
 * is warm, because the swap then costs a cache rebuild and loses detail.
 */
export function decideHistoryReplay(input: {
	config: ObservationalMemoryConfig;
	now: number;
	lastActivityAt: number | undefined;
	fullHistoryTokens: number;
	thresholds: ObservationThresholds;
	/** Provider cache retention for the model, used when `cacheTtlMs` is unset. */
	defaultCacheTtlMs?: number;
}): HistoryReplay {
	const { config, now, lastActivityAt, fullHistoryTokens, thresholds } = input;
	if (config.historyMode !== 'cacheAware') return { kind: 'sinceCursor', reason: 'masked-mode' };
	if (fullHistoryTokens >= thresholds.replayLimit) {
		return { kind: 'sinceCursor', reason: 'over-limit' };
	}
	const ttl = config.cacheTtlMs ?? input.defaultCacheTtlMs ?? DEFAULT_OBSERVATION_CACHE_TTL_MS;
	if (lastActivityAt === undefined || now - lastActivityAt > ttl) {
		return { kind: 'sinceCursor', reason: 'cache-cold' };
	}
	return { kind: 'full' };
}

/** Whether a failed or non-advancing Observer call stops observation for the run. */
export function shouldDisableAfterFailure(
	config: ObservationalMemoryConfig,
	attemptsThisRun: number,
): boolean {
	if (config.failurePolicy !== 'retry') return true;
	const max = config.maxObserverBatchesPerRun;
	return max !== undefined && attemptsThisRun >= max;
}

/** Whether another Observer call fits in this run's batch budget. */
export function hasObserverBatchBudget(
	config: ObservationalMemoryConfig,
	attemptsThisRun: number,
): boolean {
	const max = config.maxObserverBatchesPerRun;
	return max === undefined || attemptsThisRun < max;
}
