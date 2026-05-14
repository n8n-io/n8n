import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Exposes methods for common use cases to check in workflow lifeycle hooks.
 */
@Service()
export class WorkflowLifecycleHookChecksService {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	async workflowHasTag(workflowId: string, tagName: string): Promise<boolean> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: { tags: true },
		});
		return workflow?.tags?.some((tag) => tag.name === tagName) ?? false;
	}
}
