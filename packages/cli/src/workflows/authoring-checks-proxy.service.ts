import { Service } from '@n8n/di';

import type {
	RunWorkflowAuthoringChecksInput,
	WorkflowCheckResult,
} from '@/modules/workflow-authoring-checks/workflow-authoring-checks.types';

export interface WorkflowAuthoringChecks {
	runAll(input: RunWorkflowAuthoringChecksInput): Promise<WorkflowCheckResult[]>;
}

/**
 * Null-safe proxy around the workflow-authoring-checks module service. When
 * the module is disabled, `runAll` returns no violations so callers never need
 * to know whether the module is active.
 */
@Service()
export class WorkflowAuthoringChecksProxy implements WorkflowAuthoringChecks {
	private inner?: WorkflowAuthoringChecks;

	setInner(inner: WorkflowAuthoringChecks) {
		this.inner = inner;
	}

	async runAll(input: RunWorkflowAuthoringChecksInput): Promise<WorkflowCheckResult[]> {
		if (!this.inner) return [];
		return await this.inner.runAll(input);
	}
}
