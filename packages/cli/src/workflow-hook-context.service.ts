import { TagRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Exposes methods for common helpers to use in workflow lifecycle hooks.
 */
@Service()
export class WorkflowHookContextService {
	constructor(private readonly tagRepository: TagRepository) {}

	async getWorkflowTags(workflowId: string): Promise<string[]> {
		const tags = await this.tagRepository.find({
			where: { workflows: { id: workflowId } },
			select: { name: true },
		});

		return tags.map(({ name }) => name);
	}
}
