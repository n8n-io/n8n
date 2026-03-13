export type DependencyType = 'credentialId' | 'dataTableId' | 'workflowCall' | 'workflowParent';

export type DependencyResourceType = 'workflow' | 'credential' | 'dataTable';

export interface ResolvedDependency {
	type: DependencyType;
	id: string;
	name?: string; // Only included if user has permissions to view this dependency
	/** Project ID — included for data tables so the frontend can build a direct link */
	projectId?: string;
}

export type DependenciesBatchResponse = Record<string, ResolvedDependency[]>;
