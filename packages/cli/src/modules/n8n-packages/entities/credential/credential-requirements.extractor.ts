import type { AgentJsonConfig } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { extractAgentCredentialIds } from '@/modules/agents/utils/extract-agent-credential-ids';

import type { CredentialReference, WorkflowCredentialRequirement } from './credential.types';
import { visitWorkflowCredentials } from './workflow-credential-references';

@Service()
export class CredentialRequirementsExtractor {
	extractFromWorkflow(workflow: WorkflowEntity): WorkflowCredentialRequirement[] {
		const byId = new Map<string, WorkflowCredentialRequirement>();

		visitWorkflowCredentials(workflow.nodes, (credentialType, details) => {
			if (!details.id || byId.has(details.id)) return false;

			byId.set(details.id, {
				workflowId: workflow.id,
				credentialId: details.id,
				credentialName: details.name,
				credentialType,
			});
			return false;
		});

		return [...byId.values()];
	}

	extractFromAgent(config: AgentJsonConfig | null): CredentialReference[] {
		const credentials = new Map<string, CredentialReference>(
			[...extractAgentCredentialIds(config)].map((id) => [id, { credentialId: id }]),
		);
		const nodeCredentials = (config?.tools ?? [])
			.filter((tool) => tool.type === 'node')
			.flatMap(({ node }) => Object.entries(node.credentials ?? {}));
		for (const [type, details] of nodeCredentials) {
			const credential = details.id === null ? undefined : credentials.get(details.id);
			if (!credential) continue;
			if (details.name) credential.credentialName ??= details.name;
			if (type) credential.credentialType ??= type;
		}
		return [...credentials.values()];
	}
}
