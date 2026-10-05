import { SharedWorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { CacheService } from './cache/cache.service';

@Service()
export class WorkflowProjectCacheService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	async invalidateForProject(projectId: string): Promise<void> {
		const rows = await this.sharedWorkflowRepository.find({
			where: { projectId, role: 'workflow:owner' },
			select: ['workflowId'],
		});

		await Promise.all(
			rows.map(
				async ({ workflowId }) =>
					await this.cacheService.deleteFromHash('workflow-project', workflowId),
			),
		);
	}
}
