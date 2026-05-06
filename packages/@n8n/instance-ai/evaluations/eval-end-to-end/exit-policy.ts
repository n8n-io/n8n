import type { EvalEndToEndRunResult } from './types';

export function shouldFailProcessForCompletedRun(_runResult: EvalEndToEndRunResult): boolean {
	return false;
}
