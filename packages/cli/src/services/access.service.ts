import { Service } from '@n8n/di';
import type { Workflow } from 'n8n-workflow';

import type { User } from '@/databases/entities/user';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { UserRepository } from '@/databases/repositories/user.repository';

/**
 * Responsible for checking whether a user has access to a resource.
 */
@Service()
export class AccessService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	/** Whether a user has read access to a workflow based on their project and scope. */
	async hasReadAccess(userId: User['id'], workflowId: Workflow['id']) {
		const user = await this.userRepository.findOneBy({ id: userId });

		if (!user) return false;

		const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		return workflow !== null;
	}
}
