import { Service } from 'typedi';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import type { User } from '@/databases/entities/user';
import type { Workflow } from 'n8n-workflow';

@Service()
export class AccessService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	/** Whether the user has access to the workflow via project and scope. */
	async hasAccess(userId: User['id'], workflowId: Workflow['id']) {
		const user = await this.userRepository.findOneBy({ id: userId });

		if (!user) return false;

		const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		return workflow !== null;
	}
}
