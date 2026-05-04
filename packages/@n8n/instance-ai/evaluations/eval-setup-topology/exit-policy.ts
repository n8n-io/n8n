import type { EvalSetupTopologyRunResult } from './types';

export function shouldFailProcessForCompletedRun(_runResult: EvalSetupTopologyRunResult): boolean {
	return false;
}
