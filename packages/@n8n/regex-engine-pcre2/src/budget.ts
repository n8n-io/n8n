import type { EngineConfig } from './engine.js';
import { Pcre2BudgetExceededError } from './errors.js';

export interface OperationBudget {
	/** Call before every pcre2_match() attempt, including the terminating no-match probe. */
	checkTime: () => void;
	/** Call only once a match is confirmed -- not the probe that ends the loop, or a
	 *  limit of N would throw on the (N+1)th probe instead of permitting N real matches. */
	recordMatch: () => void;
}

/** Bounds a matchAll/replace/split loop as a whole; each pcre2_match() call gets its own fresh budget. */
export function createOperationBudget(
	config: EngineConfig,
	pattern: string,
	flags: string,
): OperationBudget {
	const startedAt = performance.now();
	let matches = 0;
	return {
		checkTime: () => {
			if (performance.now() - startedAt > config.operationTimeoutMs) {
				throw new Pcre2BudgetExceededError(
					`Pattern exceeded its operation budget (operation_timeout_ms=${config.operationTimeoutMs})`,
					'operation-limit',
					pattern,
					flags,
				);
			}
		},
		recordMatch: () => {
			matches++;
			if (matches > config.maxMatchesPerOperation) {
				throw new Pcre2BudgetExceededError(
					`Pattern exceeded its operation budget (max_matches_per_operation=${config.maxMatchesPerOperation})`,
					'operation-limit',
					pattern,
					flags,
				);
			}
		},
	};
}
