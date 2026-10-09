import { Service } from '@n8n/di';

import { extractAgentWorkflowRefs } from '@/modules/agents/utils/extract-agent-workflow-refs';

import type { AgentExportRequirements, PreparedAgentExport } from './agent-export.types';
import { CredentialRequirementsExtractor } from '../credential/credential-requirements.extractor';

@Service()
export class AgentRequirementsExtractor {
	constructor(private readonly credentialRequirementsExtractor: CredentialRequirementsExtractor) {}

	extract({ content, projectId }: PreparedAgentExport): AgentExportRequirements {
		const config = content.config;
		const nodeTools = (config?.tools ?? []).filter((tool) => tool.type === 'node');
		return {
			agentId: content.id,
			projectId,
			credentials: this.credentialRequirementsExtractor.extractFromAgent(config),
			workflowTools: extractAgentWorkflowRefs(config),
			agentIds: [...new Set((config?.subAgents?.agents ?? []).map(({ agentId }) => agentId))],
			nodeTools,
		};
	}
}
