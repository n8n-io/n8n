export interface DependencyGraphNode {
	id: string;
	name: string;
	type: 'workflow' | 'credential';
	active?: boolean;
}

export interface DependencyGraphEdge {
	source: string;
	target: string;
	type: 'uses_credential' | 'calls_workflow';
	label?: string;
}

export interface DependencyGraph {
	nodes: DependencyGraphNode[];
	edges: DependencyGraphEdge[];
}

export interface WorkflowDependencyInfo {
	workflowId: string;
	workflowName: string;
	dependencies: {
		credentials: Array<{
			id: string;
			name: string | null;
			type: string | null;
		}>;
		nodeTypes: Array<{
			type: string;
			count: number;
		}>;
		calledWorkflows: Array<{
			id: string;
			name: string | null;
		}>;
		webhookPaths: string[];
	};
	dependents: {
		calledByWorkflows: Array<{
			id: string;
			name: string;
		}>;
	};
}

export interface CredentialUsageInfo {
	credentialId: string;
	credentialName: string;
	credentialType: string;
	usedByWorkflows: Array<{
		id: string;
		name: string;
		active: boolean;
		nodeInfo: Record<string, unknown> | null;
	}>;
}

export interface ImpactAnalysis {
	resourceType: 'credential' | 'workflow';
	resourceId: string;
	resourceName: string;
	impactedWorkflows: Array<{
		id: string;
		name: string;
		active: boolean;
		impactType: 'direct' | 'indirect';
	}>;
	totalImpactedCount: number;
	activeImpactedCount: number;
}

export interface GraphVisualizationNode extends DependencyGraphNode {
	x?: number;
	y?: number;
	fx?: number | null;
	fy?: number | null;
	vx?: number;
	vy?: number;
	index?: number;
}

export interface GraphVisualizationLink {
	source: GraphVisualizationNode | string;
	target: GraphVisualizationNode | string;
	type: 'uses_credential' | 'calls_workflow';
	label?: string;
}
