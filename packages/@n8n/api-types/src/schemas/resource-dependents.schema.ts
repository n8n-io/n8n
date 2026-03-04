export interface WorkflowDependent {
	id: string;
	name: string;
	projectId?: string;
}

/** Keyed by resource ID, value is the list of workflows that use that resource. */
export type ResourceDependentsBatchResponse = Record<string, WorkflowDependent[]>;
