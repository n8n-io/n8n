import type { ImportBlockingIssue, ImportedAgentChannel } from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';

import type { ProjectAgent } from '@/modules/agents/entities/agent.entity';
import type { ImportedChannel } from '@/modules/agents/integrations/resolve-imported-channels';
import type { AgentImportIdentity } from '@/modules/agents/repositories/agent.repository';
import type { PlannedAgentDestinations } from '@/modules/agents/utils/agent-definition';

import type { ImportContext } from '../../n8n-packages.types';
import type { SerializedAgent, SerializedAgentMetadata } from '../../spec/serialized/agent.schema';
import type { PublishingAction, PublishingBlockedReason, PublishingOutcome } from '../publishing';

export type AgentPlanItem = PreparedAgent & {
	publishingAction: PublishingAction;
	channels: ImportedChannel[];
} & ({ action: 'create'; existing: null } | { action: 'update' | 'skip'; existing: ProjectAgent });

export interface AgentImportPlan {
	items: AgentPlanItem[];
	plannedDestinations?: PlannedAgentDestinations;
	issues: AgentImportIssue[];
}

export type PersistedAgentOutcome =
	| { status: 'skipped'; agent: ProjectAgent; sourceAgentId: string }
	| {
			status: 'created' | 'updated';
			agent: ProjectAgent;
			sourceAgentId: string;
			publishingAction: PublishingAction;
			blockedFromPublish?: PublishingBlockedReason;
			channels: ImportedAgentChannel[];
	  };

export interface AgentImportOutcome {
	status: PersistedAgentOutcome['status'];
	agent: ProjectAgent;
	sourceAgentId: string;
	publishing: PublishingOutcome;
	channels: ImportedAgentChannel[];
}

export type AgentImportIssue = Extract<ImportBlockingIssue, { type: `agent-${string}` }>;

export interface PreparedAgent extends Omit<SerializedAgent, 'id'> {
	sourceAgentId: string;
	metadata: SerializedAgentMetadata;
}

export interface AgentImportMatchContext extends Pick<ImportContext, 'user' | 'projectId'> {
	/** Set only after the project planner authorizes creation of this destination. */
	projectPendingCreation?: boolean;
}

export interface AgentIdConflict {
	sourceAgentId: string;
	existingProjectId: string | null;
}

export interface AgentImportMatches {
	matches: Map<string, AgentImportIdentity>;
	idConflicts: AgentIdConflict[];
}

export interface AgentTaskIdConflict {
	sourceAgentId: string;
	sourceTaskId: string;
	conflictingAgentId: string;
}

export function requiredAgentScopes(plan: AgentImportPlan): Scope[] {
	const scopes = new Set<Scope>(['agent:import', 'agent:read']);
	for (const item of plan.items) {
		if (item.action === 'skip') continue;
		scopes.add(item.action === 'create' ? 'agent:create' : 'agent:update');
		if (item.publishingAction === 'publish') scopes.add('agent:publish');
		if (item.publishingAction === 'unpublish') scopes.add('agent:unpublish');
	}
	return [...scopes];
}
