import type { Scope } from '@n8n/permissions';
import type { PolicyViolation } from '@n8n/decorators';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import type { AgentImportIdentity } from '@/modules/agents/repositories/agent.repository';

import type { ImportContext, WorkflowIdPolicy } from '../../n8n-packages.types';
import type { SerializedAgent, SerializedAgentMetadata } from '../../spec/serialized/agent.schema';
import type { ImportDecision } from '../import-conflict-policy';
import type { PublishingAction } from '../workflow/workflow-publishing-policy.types';

export interface AgentPlanItem extends PreparedAgent {
	action: ImportDecision['action'];
	targetAgentId: string;
	existing: Agent | null;
	taskIds: Map<string, string>;
	publishingAction: PublishingAction;
}

export interface AgentImportPlan {
	items: AgentPlanItem[];
	bindings: {
		agents: Map<string, string>;
		workflows: Map<string, string>;
		credentials: Map<string, string>;
	};
	issues: AgentImportIssue[];
}

export type AgentImportIssue =
	| {
			type: 'agent-conflict';
			kind: 'existing' | 'lineage' | 'id' | 'task-lineage' | 'task-id';
			sourceAgentId: string;
			projectId: string;
			sourceTaskId?: string;
			targetIds: string[];
	  }
	| {
			type: 'agent-invalid';
			sourceAgentId: string;
			path: string;
			message: string;
	  }
	| {
			type: 'agent-dependency-unresolved';
			sourceAgentId: string;
			projectId: string;
			dependencyType: 'agent' | 'workflow' | 'credential';
			referenceId: string;
			path: string;
			reason: 'missing' | 'inaccessible' | 'ambiguous' | 'unsupported';
	  }
	| {
			type: 'agent-policy-violation';
			sourceAgentId: string;
			name: string;
			violations: PolicyViolation[];
	  };

export interface PreparedAgent extends Omit<SerializedAgent, 'id'> {
	sourceAgentId: string;
	metadata: SerializedAgentMetadata;
}

export interface AgentImportMatchContext extends Pick<ImportContext, 'user' | 'projectId'> {
	/** Set only after the project planner authorizes creation of this destination. */
	projectPendingCreation?: boolean;
}

export interface AgentLineageConflict {
	sourceAgentId: string;
	projectId: string;
	existingAgents: AgentImportIdentity[];
}

export interface AgentIdConflict {
	sourceAgentId: string;
	existingAgentId: string;
	existingProjectId: string;
}

export interface AgentImportMatches {
	projectId: string;
	sourceAgentIds: string[];
	matches: Map<string, AgentImportIdentity>;
	lineageConflicts: AgentLineageConflict[];
}

export interface ResolvedAgentImportIdentity {
	sourceAgentId: string;
	targetAgentId: string;
	existing: AgentImportIdentity | null;
}

export interface AgentImportIdentities {
	projectId: string;
	idPolicy: WorkflowIdPolicy;
	identities: Map<string, ResolvedAgentImportIdentity>;
	lineageConflicts: AgentLineageConflict[];
	idConflicts: AgentIdConflict[];
}

export interface AgentTaskLineageConflict {
	sourceAgentId: string;
	targetAgentId: string;
	sourceTaskId: string;
	existingTaskIds: string[];
}

export interface AgentTaskIdConflict {
	sourceAgentId: string;
	targetAgentId: string;
	sourceTaskId: string;
	targetTaskId: string;
	conflictingAgentId: string;
}

export interface AgentTaskImportMappings {
	taskIdsBySourceAgentId: Map<string, Map<string, string>>;
	lineageConflicts: AgentTaskLineageConflict[];
	idConflicts: AgentTaskIdConflict[];
}

export function requiredAgentScopes(plan: AgentImportPlan): Scope[] {
	const scopes = new Set<Scope>(['agent:read']);
	for (const item of plan.items) {
		if (item.action === 'skip') continue;
		scopes.add(item.action === 'create' ? 'agent:create' : 'agent:update');
		if (item.publishingAction === 'publish') scopes.add('agent:publish');
		if (item.publishingAction === 'unpublish') scopes.add('agent:unpublish');
	}
	return [...scopes];
}
