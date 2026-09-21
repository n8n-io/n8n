import type { DatabricksJobRun } from '../interfaces';

// TERMINATED ends `status.state`; SKIPPED and INTERNAL_ERROR end the deprecated `state.life_cycle_state`
const TERMINAL_RUN_STATES = new Set(['TERMINATED', 'SKIPPED', 'INTERNAL_ERROR']);

/** Jobs API 2.2 deprecates `state` for `status`, but payloads in the wild still carry either. */
export function getRunState(run: DatabricksJobRun): string {
	return run.status?.state ?? run.state?.life_cycle_state ?? '';
}

export function isRunFinished(run: DatabricksJobRun): boolean {
	return TERMINAL_RUN_STATES.has(getRunState(run));
}

export function getRunOutcome(run: DatabricksJobRun): {
	success: boolean;
	code: string;
	message: string;
} {
	const details = run.status?.termination_details;
	if (details) {
		const code = details.code ?? details.type ?? 'UNKNOWN';
		return { success: code === 'SUCCESS', code, message: details.message ?? '' };
	}
	const code = run.state?.result_state ?? getRunState(run);
	return { success: code === 'SUCCESS', code, message: run.state?.state_message ?? '' };
}

export function describeRunPage(run: DatabricksJobRun): string | undefined {
	return run.run_page_url
		? `Open the run page in Databricks for details: ${run.run_page_url}`
		: undefined;
}
