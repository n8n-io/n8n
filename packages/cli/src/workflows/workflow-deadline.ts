import type { ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { IWorkflowSettings } from 'n8n-workflow';

/**
 * Determines a workflow's deadline given its start time, its settings
 * and global execution config.
 */
export function determineWorkflowDeadline(
	startTime: number,
	workflowSettings: IWorkflowSettings | undefined,
	executionsConfig: ExecutionsConfig,
): number | undefined {
	const effectiveMaxTimeout =
		executionsConfig.maxTimeout > 0 ? executionsConfig.maxTimeout : Infinity;

	if (workflowSettings?.executionTimeout !== undefined) {
		// A defined timeout of <= 0 means the workflow's own timeout is explicitly
		// disabled, so it runs unbounded rather than falling back to the global
		// default. Otherwise it is clamped to the configurable maximum. This mirrors
		// the main-workflow path in workflow-runner.ts and job-processor.ts.
		if (workflowSettings.executionTimeout <= 0) {
			return undefined;
		}
		return (
			startTime +
			Math.min(workflowSettings.executionTimeout, effectiveMaxTimeout) * Time.seconds.toMilliseconds
		);
	}
	if (executionsConfig.timeout > 0) {
		return (
			startTime +
			Math.min(executionsConfig.timeout, effectiveMaxTimeout) * Time.seconds.toMilliseconds
		);
	}
	return undefined;
}

/** A deadline in epoch milliseconds, as the engine v2 start request takes it. */
export function toIsoDeadline(deadline: number | undefined): string | undefined {
	return deadline === undefined ? undefined : new Date(deadline).toISOString();
}
