import type { AgentDefinition } from '@/modules/agents/agent-config.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';

import type {
	BlockingIssue,
	ImportContext,
	ImportedAgentSummary,
	ImportBindingMap,
} from '../../n8n-packages.types';
import type { NodeTypeUsage } from '../workflow/node-type-usage';

export interface PreparedAgent {
	sourceAgentId: string;
	definition: AgentDefinition;
	sourcePublished?: boolean;
}

export interface AgentPlanItem extends PreparedAgent {
	action: 'create' | 'update' | 'skip';
	targetId: string;
	existing: Agent | null;
	taskBindings: ImportBindingMap;
}

export interface AgentImportPlan {
	context: ImportContext;
	items: AgentPlanItem[];
	blockingIssues: BlockingIssue[];
	missingNodeTypes: NodeTypeUsage[];
}

export interface PersistedAgentOutcome {
	item: AgentPlanItem;
	agent: Agent;
	summary: ImportedAgentSummary;
}
