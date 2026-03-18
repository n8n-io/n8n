export type DependencyType = 'credentialId' | 'dataTableId' | 'workflowCall' | 'workflowParent';

export type DependencyResourceType = 'workflow' | 'credential' | 'dataTable';

export interface ResolvedDependency {
	type: DependencyType;
	id: string;
	name: string;
	/** Project ID — included for data tables so the frontend can build a direct link */
	projectId?: string;
}

export interface ResolvedDependenciesResult {
	dependencies: ResolvedDependency[];
	/** Number of dependencies the user does not have access to view */
	inaccessibleCount: number;
}

export type DependenciesBatchResponse = Record<string, ResolvedDependenciesResult>;
