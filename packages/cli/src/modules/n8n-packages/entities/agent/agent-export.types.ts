import type { User } from '@n8n/db';

import type { PackageWriter } from '../../io/package-writer';
import type { ExportDependencyPolicy, ExportVersionPolicy } from '../../n8n-packages.types';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageAgentRequirement } from '../../spec/requirements.schema';
import type { SerializedAgent, SerializedAgentMetadata } from '../../spec/serialized/agent.schema';
import type { ExportRequirements } from '../requirements.types';
import type { AgentWorkflowRequirement } from '../workflow/workflow.types';

export interface PreparedAgentExport {
	projectId: string;
	content: SerializedAgent;
	metadata: SerializedAgentMetadata;
}

export interface AgentExportRequirements extends ExportRequirements {
	workflows: AgentWorkflowRequirement[];
	agentIds: string[];
}

export interface AgentSelectionExportRequest {
	user: User;
	writer: PackageWriter;
	agentIds?: string[];
	projectIds?: string[];
	/** A restricted project export does not select Agents. */
	projectWorkflowIds?: string[];
	versionPolicy?: ExportVersionPolicy;
	dependencyPolicy?: ExportDependencyPolicy;
	projectTargetsById?: Map<string, string>;
}

export interface AgentSelectionExportResult {
	agentEntries: ManifestEntry[];
	projectEntries: ManifestEntry[];
	projectTargetsById: Map<string, string>;
	requirements: ExportRequirements;
	workflowRequirements: AgentWorkflowRequirement[];
	agentRequirements: PackageAgentRequirement[];
	agentIds: string[];
	counts: { agents: number };
}
