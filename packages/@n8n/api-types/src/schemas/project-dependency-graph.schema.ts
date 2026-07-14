import type { ProjectIcon, ProjectType } from './project.schema';

export type GraphNodeType = 'credential' | 'dataTable' | 'folder' | 'tag' | 'workflow';

export type RelationshipType =
	| 'calls-workflow'
	| 'contained-in-folder'
	| 'handles-errors-for'
	| 'references-data-table'
	| 'tagged-with'
	| 'uses-as-tool'
	| 'uses-credential';

export type WorkflowTriggerType =
	| 'chat'
	| 'webhook'
	| 'schedule'
	| 'slack'
	| 'error'
	| 'form'
	| 'mcp'
	| 'subworkflow'
	| 'manual'
	| 'none';

export interface GraphNode {
	id: string;
	type: GraphNodeType;
	name: string;
	/** Present when the node belongs to a different project than the one being queried. */
	projectId?: string;
	/** false = referenced but its own dependencies are not resolved (non-explode view). */
	expanded: boolean;
	metadata: {
		/** workflow: true when activeVersionId is non-null */
		active?: boolean;
		/** workflow: true when archived */
		archived?: boolean;
		/** workflow or folder: the parent folder ID, or null for project root */
		parentFolderId?: string | null;
		/**
		 * workflow: ancestor folder IDs from the project root (outermost first) down to the
		 * direct parent folder. Empty for workflows at the project root; absent when the
		 * workflow belongs to another project.
		 */
		folderPath?: string[];
		/** workflow: primary trigger type, derived from the workflow's trigger nodes */
		triggerType?: WorkflowTriggerType;
		/** folder: recursive count of workflows inside (including nested folders) */
		workflowCount?: number;
	};
}

export interface GraphEdge {
	sourceId: string;
	targetId: string;
	type: RelationshipType;
	metadata?: {
		/** which node within the source workflow created this dependency */
		nodeId?: string;
		nodeVersion?: number;
	};
}

export interface ProjectGraphMember {
	id: string;
	name: string;
	email: string;
	role: string;
}

export interface ProjectGraphVariable {
	id: string;
	key: string;
	type: string;
	scope: 'global' | 'project';
}

export interface ProjectGraphStats {
	totalWorkflows: number;
	activeWorkflows: number;
	totalCredentials: number;
	totalDataTables: number;
	totalFolders: number;
	totalVariables: number;
	totalMembers: number;
}

export interface ProjectDependencyGraph {
	project: {
		id: string;
		name: string;
		type: ProjectType;
		icon?: ProjectIcon;
		description?: string;
	};
	nodes: GraphNode[];
	edges: GraphEdge[];
	members: ProjectGraphMember[];
	variables: ProjectGraphVariable[];
	stats: ProjectGraphStats;
}
