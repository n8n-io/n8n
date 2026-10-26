import type { ExecutionsConfig } from '@n8n/config';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { toSaveSettings } from './to-save-settings';

/**
 * Whether n8n keeps a finished manual execution that it does not save for the
 * user who started it. Only while pruning hard-deletes soft-deleted executions
 * after a buffer, which bounds how long the execution stays.
 */
export function keepsUnsavedManualExecutions(
	config: Pick<ExecutionsConfig, 'pruneData' | 'pruneDataHardDeleteBuffer'>,
): boolean {
	return config.pruneData && config.pruneDataHardDeleteBuffer > 0;
}

/**
 * The user to record on a new manual execution that n8n will not save. Only that
 * user can read it after it finishes. Recorded at start, because a resumed run may
 * act as a different user.
 *
 * Only for a run that a browser shows, which has a `pushRef`. n8n also starts manual
 * runs without one, for example to fetch an evaluation dataset, and does not keep them.
 */
export function resolveUnsavedManualExecutionStarter(
	data: Pick<
		IWorkflowExecutionDataProcess,
		'executionMode' | 'workflowData' | 'userId' | 'pushRef'
	>,
	config: Pick<ExecutionsConfig, 'pruneData' | 'pruneDataHardDeleteBuffer'>,
): string | undefined {
	if (data.executionMode !== 'manual' || !data.userId || !data.pushRef) return undefined;
	if (!keepsUnsavedManualExecutions(config)) return undefined;
	return toSaveSettings(data.workflowData.settings).manual ? undefined : data.userId;
}
