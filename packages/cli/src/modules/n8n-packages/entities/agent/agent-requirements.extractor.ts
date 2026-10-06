import type { AgentJsonConfig, AgentJsonNodeToolConfig } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { extractAgentCredentialIds } from '@/modules/agents/utils/extract-agent-credential-ids';
import { extractAgentWorkflowRefs } from '@/modules/agents/utils/extract-agent-workflow-refs';

import type {
	AgentCredentialRequirement,
	AgentExportRequirements,
	PreparedAgentExport,
} from './agent-export.types';

@Service()
export class AgentRequirementsExtractor {
	extract({ content, projectId }: PreparedAgentExport): AgentExportRequirements {
		const config = content.config;
		const nodeTools = (config?.tools ?? []).filter((tool) => tool.type === 'node');
		return {
			agentId: content.id,
			projectId,
			credentials: this.credentials(config, nodeTools),
			workflowTools: extractAgentWorkflowRefs(config),
			agentIds: [...new Set((config?.subAgents?.agents ?? []).map(({ agentId }) => agentId))],
			nodeTools,
		};
	}

	private credentials(
		config: AgentJsonConfig | null,
		nodeTools: AgentJsonNodeToolConfig[],
	): AgentCredentialRequirement[] {
		const credentials = new Map<string, AgentCredentialRequirement>(
			[...extractAgentCredentialIds(config)].map((id) => [id, { credentialId: id }]),
		);
		const nodeCredentials = nodeTools.flatMap(({ node }) => Object.entries(node.credentials ?? {}));
		for (const [type, details] of nodeCredentials) {
			const credential = details.id === null ? undefined : credentials.get(details.id);
			if (!credential) continue;
			if (details.name) credential.credentialName ??= details.name;
			if (type) credential.credentialType ??= type;
		}
		return [...credentials.values()];
	}
}
