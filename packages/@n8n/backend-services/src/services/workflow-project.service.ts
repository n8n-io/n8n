import { CacheService } from './cache/cache.service';
import { isEntityNotFoundError, Project, SharedWorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

@Service()
export class WorkflowProjectService {
	private readonly privateOwners = new Map<
		string,
		(workflowId: string) => Promise<Project | undefined>
	>();

	/** Resolve module-owned execution graphs without granting access through workflow shares. */
	registerPrivateOwner(
		name: string,
		resolve: (workflowId: string) => Promise<Project | undefined>,
	): void {
		this.privateOwners.set(name, resolve);
	}

	constructor(
		private readonly cacheService: CacheService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	private reconstructProject(project: Partial<Project>): Project | undefined {
		if (typeof project !== 'object' || project === null || typeof project.id !== 'string') {
			return undefined;
		}
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

		try {
			const sharedWorkflow = await this.sharedWorkflowRepository.findOneOrFail({
				where: { workflowId, role: 'workflow:owner' },
				relations: ['project'],
			});
			return await this.setWorkflowProjectCacheEntry(workflowId, sharedWorkflow.project);
		} catch (error) {
			if (!isEntityNotFoundError(error)) throw error;
			for (const resolve of this.privateOwners.values()) {
				const owner = await resolve(workflowId);
				// Private owners follow their module's current scope. Do not cache them as shared workflows.
				if (owner) return owner;
			}
			// Callers detect a workflow without an owner by this error.
			throw error;
		}
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
