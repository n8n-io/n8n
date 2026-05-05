import type { EvalDataQualityRunResult } from './types';

export function formatRunSummary(runResult: EvalDataQualityRunResult): string {
	const total = runResult.results.length;
	const passed = runResult.results.filter((result) => result.passed).length;
	const failed = total - passed;
	return `Summary: ${String(passed)}/${String(total)} passed, ${String(failed)} failed`;
}
