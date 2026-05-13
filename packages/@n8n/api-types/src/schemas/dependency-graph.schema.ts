/** Structured JSON form of the workflow-dependency graph for in-app visualisations. */

export type DependencyNodeKind = 'workflow' | 'credential' | 'dataTable';

export interface DependencyNode {
	/** Stable id: the resource id (or a synthetic id for restricted nodes) */
	id: string;
	kind: DependencyNodeKind;
	/** Display name — `(restricted)` if the user cannot read this resource */
	name: string;
	/** Project the resource belongs to. Undefined for restricted / unprojected nodes. */
	projectId?: string;
	/** True if the user lacks permission to view the underlying resource. */
	restricted: boolean;
}

export type DependencyEdgeKind = 'workflowCall' | 'errorWorkflow' | 'credentialId' | 'dataTableId';

export interface DependencyEdge {
	source: string;
	target: string;
	kind: DependencyEdgeKind;
}

export interface DependencyProject {
	id: string;
	name: string;
}

export interface DependencyGraphResponse {
	projects: DependencyProject[];
	nodes: DependencyNode[];
	edges: DependencyEdge[];
}
