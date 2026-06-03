import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import type { WorkflowCredentialRequirement } from './credential.types';
import type { RequirementsExtractor } from '../requirements-extractor';

@Service()
export class CredentialRequirementsExtractor
	implements RequirementsExtractor<WorkflowCredentialRequirement>
{
	extract(workflow: WorkflowEntity): WorkflowCredentialRequirement[] {
		const byId = new Map<string, WorkflowCredentialRequirement>();

		for (const node of workflow.nodes ?? []) {
			for (const [credentialType, details] of Object.entries(node.credentials ?? {})) {
				if (!details?.id || byId.has(details.id)) continue;

				byId.set(details.id, {
					workflowId: workflow.id,
					credentialId: details.id,
					credentialName: details.name,
					credentialType,
				});
			}
		}

		return [...byId.values()];
	}
}
