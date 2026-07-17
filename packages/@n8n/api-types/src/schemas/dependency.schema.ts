export type DependencyType =
	| 'aiToolWorkflowCall'
	| 'aiToolWorkflowParent'
	| 'credentialId'
	| 'dataTableId'
	| 'errorWorkflow'
	| 'errorWorkflowParent'
	| 'workflowCall'
	| 'workflowParent';

export type DependencyResourceType = 'workflow' | 'credential' | 'dataTable';

/** Metadata carried on credential dependencies — describes what the credential is used for. */
export interface CredentialDependencyMetadata {
	nodeId?: string;
	nodeType?: string;
	/** For standard nodes: the resource parameter (e.g. 'message'). For HTTP nodes: normalized URL. */
	resource?: string;
	/** For standard nodes: the operation parameter. For HTTP nodes: the HTTP method. */
	operation?: string;
}

export interface ResolvedDependency {
	type: DependencyType;
	id: string;
	name: string;
	/** Project ID — included for data tables so the frontend can build a direct link */
	projectId?: string;
	/** Present on credentialId deps — describes the resource/operation the credential is used for. */
	metadata?: CredentialDependencyMetadata;
}

export interface ResolvedDependenciesResult {
	dependencies: ResolvedDependency[];
	/** Number of dependencies the user does not have access to view */
	inaccessibleCount: number;
}

export type DependenciesBatchResponse = Record<string, ResolvedDependenciesResult>;
