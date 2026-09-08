/** The part of a project a module may read through {@link WorkflowProjectLookup}. */
export interface WorkflowProjectSummary {
	id: string;
	customTelemetryTags?: Array<{ key: string; value: string }>;
}

/**
 * Port that resolves the project which owns a workflow.
 *
 * The host binds an implementation at bootstrap. The port stays this narrow on
 * purpose: the host's ownership service also writes config and sets up owners,
 * which is not a module concern.
 */
export abstract class WorkflowProjectLookup {
	abstract getWorkflowProjectCached(workflowId: string): Promise<WorkflowProjectSummary>;
}
