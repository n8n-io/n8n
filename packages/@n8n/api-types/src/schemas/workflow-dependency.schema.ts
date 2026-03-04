export type WorkflowDependencyType =
	| 'credentialId'
	| 'dataTableId'
	| 'workflowCall'
	| 'workflowParent';

export interface ResolvedDependency {
	type: WorkflowDependencyType;
	id: string;
	name: string;
	/** Project ID — included for data tables so the frontend can build a direct link */
	projectId?: string;
}

export type WorkflowDependenciesBatchResponse = Record<string, ResolvedDependency[]>;
