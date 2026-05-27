import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import type { WorkflowCredentialRequirement } from './credential.types';
import type { RequirementsExtractor } from '../requirements-extractor';

@Service()
export class CredentialRequirementsExtractor
	implements RequirementsExtractor<WorkflowCredentialRequirement>
{
	extract(workflow: WorkflowEntity): WorkflowCredentialRequirement[] {
		const seen = new Set<string>();
		const requirements: WorkflowCredentialRequirement[] = [];

		for (const node of workflow.nodes ?? []) {
			if (!node.credentials) continue;

			for (const [credentialType, details] of Object.entries(node.credentials)) {
				if (!details?.id) continue;
				if (seen.has(details.id)) continue;
				seen.add(details.id);

				requirements.push({
					workflowId: workflow.id,
					credentialId: details.id,
					credentialName: details.name,
					credentialType,
				});
			}
		}

		return requirements;
	}
}
