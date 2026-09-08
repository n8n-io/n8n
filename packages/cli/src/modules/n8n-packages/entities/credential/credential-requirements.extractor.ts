import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import type { WorkflowCredentialRequirement } from './credential.types';
import { visitWorkflowCredentials } from './workflow-credential-references';
import type { RequirementsExtractor } from '../requirements-extractor';

@Service()
export class CredentialRequirementsExtractor
	implements RequirementsExtractor<WorkflowCredentialRequirement>
{
	extract(workflow: WorkflowEntity): WorkflowCredentialRequirement[] {
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
}
