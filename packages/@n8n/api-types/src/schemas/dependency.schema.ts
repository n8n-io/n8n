export type DependencyType =
	| 'agentUsage'
	| 'credentialId'
	| 'dataTableId'
	| 'errorWorkflow'
	| 'errorWorkflowParent'
	| 'workflowCall'
	| 'workflowParent';

export type DependencyResourceType = 'workflow' | 'credential' | 'dataTable';

/** The workflow version that holds a dependency link: the draft or the published version. */
export type DependencyVersion = 'draft' | 'published';

export interface ResolvedDependency {
	type: DependencyType;
	id: string;
	name: string;
	/** Project ID — included for agents and data tables so the frontend can build a direct link */
	projectId?: string;
	unavailable?: boolean;
	/**
	 * The workflow versions that hold the link. Set only when the caller asks for it, and only on
	 * links read from the workflow dependency index (not on agent usage).
	 */
	versions?: DependencyVersion[];
}

export interface ResolvedDependenciesResult {
	dependencies: ResolvedDependency[];
	/** Number of dependencies the user does not have access to view */
	inaccessibleCount: number;
}

export type DependenciesBatchResponse = Record<string, ResolvedDependenciesResult>;
