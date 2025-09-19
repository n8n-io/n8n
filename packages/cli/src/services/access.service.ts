import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Workflow } from 'n8n-workflow';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

/**
 * Responsible for checking whether a user has access to a resource.
 */
@Service()
export class AccessService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	/** Whether a user has read access to a workflow based on their project and scope. */
	async hasReadAccess(userId: User['id'], workflowId: Workflow['id']) {
		const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });

		if (!user) return false;

		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		return workflow !== null;
	}
}
