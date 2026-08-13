export type DependencyType =
	| 'agentUsage'
	| 'credentialId'
	| 'dataTableId'
	| 'errorWorkflow'
	| 'errorWorkflowParent'
	| 'fileId'
	| 'workflowCall'
	| 'workflowParent';

export type DependencyResourceType = 'workflow' | 'credential' | 'dataTable' | 'file';

export interface ResolvedDependency {
	type: DependencyType;
	id: string;
	name: string;
	/** Project ID — included for agents, data tables, and files so the frontend can build a direct link */
	projectId?: string;
}

export interface ResolvedDependenciesResult {
	dependencies: ResolvedDependency[];
	/** Number of dependencies the user does not have access to view */
	inaccessibleCount: number;
}

export type DependenciesBatchResponse = Record<string, ResolvedDependenciesResult>;
