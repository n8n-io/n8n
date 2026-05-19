import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Exposes methods for common use cases to check in workflow lifecycle hooks.
 */
@Service()
export class WorkflowHookContextService {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	async hasWorkflowTag(workflowId: string, tagName: string): Promise<boolean> {
		const count = await this.workflowRepository
			.createQueryBuilder('workflow')
			.innerJoin('workflow.tags', 'tag', 'tag.name = :tagName', { tagName })
			.where('workflow.id = :workflowId', { workflowId })
			.getCount();
		return count > 0;
	}
}
