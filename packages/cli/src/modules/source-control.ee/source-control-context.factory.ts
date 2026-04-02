import { ProjectRepository, WorkflowRepository } from '@n8n/db';
import type { Project, User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, type FindOptionsWhere } from '@n8n/typeorm';

import { SourceControlContext } from './types/source-control-context';

@Service()
export class SourceControlContextFactory {
	constructor(
		private readonly projectRepository: ProjectRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async createContext(user: User): Promise<SourceControlContext> {
		if (hasGlobalScope(user, 'project:update')) {
			return new SourceControlContext(user, await this.fetchAllProjects(), []);
		}

		const [authorizedProjects, accessibleWorkflowIds] = await Promise.all([
			this.fetchAuthorizedProjects(user),
			this.fetchAccessibleWorkflowIds(user),
		]);

		return new SourceControlContext(user, authorizedProjects, accessibleWorkflowIds);
	}

	private async fetchAllProjects(): Promise<Project[]> {
		const projects = await this.projectRepository.find();

		const personalProjects = projects.filter((p) => p.type === 'personal');
		if (personalProjects.length > 0) {
			const personalProjectIds = personalProjects.map((p) => p.id);
			const ownerRelations = await this.projectRepository
				.createQueryBuilder('project')
				.leftJoinAndSelect('project.projectRelations', 'pr', 'pr.role = :ownerRole', {
					ownerRole: 'project:personalOwner',
				})
				.leftJoinAndSelect('pr.role', 'role')
				.leftJoinAndSelect('pr.user', 'user')
				.where('project.id IN (:...ids)', { ids: personalProjectIds })
				.select(['project.id', 'pr.userId', 'pr.projectId', 'role.slug', 'user.email'])
				.getMany();

			const relationsById = new Map(ownerRelations.map((p) => [p.id, p.projectRelations]));
			for (const project of personalProjects) {
				project.projectRelations = relationsById.get(project.id) ?? [];
			}
		}

		for (const project of projects) {
			if (project.type === 'team') {
				project.projectRelations = [];
			}
		}

		return projects;
	}

	private async fetchAuthorizedProjects(user: User): Promise<Project[]> {
		const projectEntities = await this.projectRepository
			.createQueryBuilder('project')
			.innerJoin('project.projectRelations', 'pr', 'pr.userId = :userId', {
				userId: user.id,
			})
			.innerJoin('pr.role', 'role')
			.innerJoin('role.scopes', 'scope', 'scope.slug = :scope', {
				scope: 'sourceControl:push',
			})
			.where('project.type = :type', { type: 'team' })
			.select(['project.id'])
			.getMany();

		if (projectEntities.length === 0) return [];

		const ids = projectEntities.map((p) => p.id);
		const projects = await this.projectRepository.find({
			select: { id: true, name: true, type: true },
			where: { id: In(ids) },
		});

		for (const project of projects) {
			project.projectRelations = [];
		}

		return projects;
	}

	private async fetchAccessibleWorkflowIds(user: User): Promise<string[]> {
		const where: FindOptionsWhere<WorkflowEntity> = {
			shared: {
				role: 'workflow:owner',
				project: {
					type: 'team',
					projectRelations: {
						role: {
							scopes: {
								slug: 'sourceControl:push',
							},
						},
						userId: user.id,
					},
				},
			},
		};
		const workflows = await this.workflowRepository.find({ select: { id: true }, where });
		return workflows.map((w) => w.id);
	}
}
