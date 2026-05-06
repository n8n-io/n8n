import type { EvalProactiveOfferRunResult } from './types';

export function shouldFailProcessForCompletedRun(_runResult: EvalProactiveOfferRunResult): boolean {
	return false;
}
