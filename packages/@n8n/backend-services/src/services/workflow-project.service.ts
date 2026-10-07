import { CacheService } from './cache/cache.service';
import { Project, SharedWorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

@Service()
export class WorkflowProjectService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	async getWorkflowProjectCached(workflowId: string): Promise<Project> {
		const cachedValue = await this.cacheService.getHashValue<Partial<Project>>(
			'workflow-project',
			workflowId,
		);

		if (cachedValue) {
			return Object.assign(new Project(), cachedValue);
		}

		const sharedWorkflow = await this.sharedWorkflowRepository.findOneOrFail({
			where: { workflowId, role: 'workflow:owner' },
			relations: ['project'],
		});

		void this.cacheService.setHash('workflow-project', {
			[workflowId]: { ...sharedWorkflow.project },
		});

		return sharedWorkflow.project;
	}
}
