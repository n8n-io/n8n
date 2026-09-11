import type { EngineConfig } from './engine.js';
import { Pcre2BudgetExceededError } from './errors.js';

/** Bounds a matchAll/replace/split loop as a whole; each pcre2_match() call gets its own fresh budget. */
export function createOperationBudget(
	config: EngineConfig,
	pattern: string,
	flags: string,
): () => void {
	const startedAt = performance.now();
	let matches = 0;
	return () => {
		matches++;
		if (matches > config.maxMatchesPerOperation) {
			throw new Pcre2BudgetExceededError(
				`Pattern exceeded its operation budget (max_matches_per_operation=${config.maxMatchesPerOperation})`,
				'operation-limit',
				pattern,
				flags,
			);
		}
		if (performance.now() - startedAt > config.operationTimeoutMs) {
			throw new Pcre2BudgetExceededError(
				`Pattern exceeded its operation budget (operation_timeout_ms=${config.operationTimeoutMs})`,
				'operation-limit',
				pattern,
				flags,
			);
		}
	};
}
