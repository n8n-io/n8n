import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Exposes methods for common use cases to check in workflow lifecycle hooks.
 */
@Service()
export class WorkflowHookContextService {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	async hasWorkflowTags(workflowId: string, tagNames: [string, ...string[]]): Promise<boolean> {
		const result = await this.workflowRepository
			.createQueryBuilder('workflow')
			.innerJoin('workflow.tags', 'tag')
			.where('workflow.id = :workflowId', { workflowId })
			.andWhere('tag.name IN (:...tagNames)', { tagNames })
			.select('COUNT(*)', 'matchingTagsCount')
			.getRawOne<{ matchingTagsCount: string }>();

		return Number(result?.matchingTagsCount ?? 0) === tagNames.length;
	}
}
