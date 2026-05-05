import type { EvalDataQualityRunResult } from './types';

export function shouldFailProcessForCompletedRun(_runResult: EvalDataQualityRunResult): boolean {
	return false;
}
