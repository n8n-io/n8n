import type { AquariumSecurity } from '@n8n/api-types';
import { WorkflowSharingService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { securityRisksOf } from './security-checks';

/**
 * Runs a few checks of the security audit on the workflows that the user can read. The full
 * audit is for owners and admins only, but these checks look only at nodes and connections,
 * which every reader of the workflow can already see.
 */
@Service()
export class AquariumSecurityService {
	constructor(
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async getSecurity(user: User): Promise<AquariumSecurity> {
		const readableIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['workflow:read'],
		});
		if (readableIds.length === 0) return { workflows: [] };

		const workflows = await this.workflowRepository.findByIds(readableIds, {
			fields: ['nodes', 'connections', 'activeVersionId'],
		});

		return {
			workflows: workflows.flatMap((workflow) => {
				const risks = securityRisksOf(workflow);
				return risks.length > 0 ? [{ workflowId: workflow.id, risks }] : [];
			}),
		};
	}
}
