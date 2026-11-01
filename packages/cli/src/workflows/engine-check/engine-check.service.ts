import type { EngineCheckResult } from '@n8n/api-types';
import type { WorkflowHistory } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IWorkflowSettings } from 'n8n-workflow';

export type WorkflowEngineType = NonNullable<IWorkflowSettings['engineType']>;

/**
 * Checks whether a workflow version can run on an engine. Publish calls it
 * before any state changes, so a failed check leaves the published version as it is.
 */
@Service()
export class EngineCheckService {
	// TODO(CAP-702): run the real compatibility check. Until then every version passes.
	async check(
		_version: Pick<WorkflowHistory, 'workflowId' | 'versionId' | 'nodes' | 'connections'>,
		_engineType: WorkflowEngineType,
	): Promise<EngineCheckResult> {
		return await Promise.resolve({ ok: true });
	}
}
