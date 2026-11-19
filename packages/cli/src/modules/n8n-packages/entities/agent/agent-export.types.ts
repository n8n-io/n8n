import type { User } from '@n8n/db';

import type { PackageWriter } from '../../io/package-writer';
import type { ExportDependencyPolicy, ExportVersionPolicy } from '../../n8n-packages.types';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageAgentRequirement } from '../../spec/requirements.schema';
import type { SerializedAgent, SerializedAgentMetadata } from '../../spec/serialized/agent.schema';
import type { ExportRequirements } from '../requirements.types';
import type { AgentWorkflowRequirement } from '../workflow/workflow.types';

export interface PreparedAgentExport {
	parentFolderId?: string | null;
	projectId: string;
	content: SerializedAgent;
	metadata: SerializedAgentMetadata;
}

export interface AgentExportRequirements extends ExportRequirements {
	workflows: AgentWorkflowRequirement[];
	agentIds: string[];
}

export interface AgentSelectionExportRequest {
	folderIds?: string[];
	existingFolderEntries?: ManifestEntry[];
	user: User;
	writer: PackageWriter;
	agentIds?: string[];
	projectIds?: string[];
	/** A restricted project export does not select Agents. */
	projectWorkflowIds?: string[];
	versionPolicy?: ExportVersionPolicy;
	dependencyPolicy?: ExportDependencyPolicy;
	/** Whether project exports include archived Agents. Agents given by id always export. */
	includeArchived?: boolean;
	projectTargetsById?: Map<string, string>;
}

export interface AgentSelectionExportResult {
	folderEntries?: ManifestEntry[];
	agentEntries: ManifestEntry[];
	skillEntries: ManifestEntry[];
	projectEntries: ManifestEntry[];
	projectTargetsById: Map<string, string>;
	requirements: ExportRequirements;
	workflowRequirements: AgentWorkflowRequirement[];
	agentRequirements: PackageAgentRequirement[];
	agentIds: string[];
	counts: { agents: number };
}
