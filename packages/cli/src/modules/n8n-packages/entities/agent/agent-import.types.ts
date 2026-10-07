import type { AgentImportIdentity } from '@/modules/agents/repositories/agent.repository';

import type { ImportContext, WorkflowIdPolicy } from '../../n8n-packages.types';
import type { SerializedAgent, SerializedAgentMetadata } from '../../spec/serialized/agent.schema';

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
