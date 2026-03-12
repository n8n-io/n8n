export type DependencyType = 'credentialId' | 'dataTableId' | 'workflowCall' | 'workflowParent';

export interface ResolvedDependency {
	type: DependencyType;
	id: string;
	name: string;
	/** Project ID — included for data tables so the frontend can build a direct link */
	projectId?: string;
}

export type DependenciesBatchResponse = Record<string, ResolvedDependency[]>;
