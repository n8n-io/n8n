import { CacheService } from './cache/cache.service';
import { Project, SharedWorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

@Service()
export class WorkflowProjectService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	private reconstructProject(project: Partial<Project>): Project | undefined {
		if (typeof project !== 'object' || project === null) return undefined;
		return Object.assign(new Project(), project);
	}

	async getWorkflowProjectCached(workflowId: string): Promise<Project> {
		const cachedValue = await this.cacheService.getHashValue<Partial<Project>>(
			'workflow-project',
			workflowId,
		);

		if (cachedValue) {
			const project = this.reconstructProject(cachedValue);
			if (project) return project;
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

	async setWorkflowProjectCacheEntry(workflowId: string, project: Project): Promise<Project> {
		void this.cacheService.setHash('workflow-project', {
			[workflowId]: { ...project },
		});

		return project;
	}

	async invalidateWorkflowProjectCacheForProject(projectId: string): Promise<void> {
		const rows = await this.sharedWorkflowRepository.find({
			where: { projectId, role: 'workflow:owner' },
			select: ['workflowId'],
		});
		await this.invalidateWorkflowProjectCacheByIds(rows.map(({ workflowId }) => workflowId));
	}

	async invalidateWorkflowProjectCacheByIds(workflowIds: string[]): Promise<void> {
		await Promise.all(
			workflowIds.map(
				async (workflowId) =>
					await this.cacheService.deleteFromHash('workflow-project', workflowId),
			),
		);
	}
}
