import { Service } from 'typedi';
import { SharedWorkflowRepository } from '@db/repositories';

@Service()
export class RoleService {
	constructor(private sharedWorkflowRepository: SharedWorkflowRepository) {}

	async getUserRoleForWorkflow(userId: string, workflowId: string) {
		const shared = await this.sharedWorkflowRepository.findOne({
			where: { workflowId, userId },
		});
		return shared?.role;
	}
}
