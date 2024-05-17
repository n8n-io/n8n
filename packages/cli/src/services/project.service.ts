import { Project, type ProjectType } from '@/databases/entities/Project';
import { ProjectRelation } from '@/databases/entities/ProjectRelation';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';
import type { User } from '@/databases/entities/User';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import type { FindOptionsWhere, EntityManager } from '@n8n/typeorm';
import Container, { Service } from 'typedi';
import { type Scope } from '@n8n/permissions';
import { In, Not } from '@n8n/typeorm';
import { RoleService } from './role.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { SharedWorkflowRepository } from '@/databases/repositories/sharedWorkflow.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/sharedCredentials.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { CacheService } from './cache/cache.service';
import { License } from '@/License';
import { UNLIMITED_LICENSE_QUOTA } from '@/constants';

export class TeamProjectOverQuotaError extends Error {
	constructor(limit: number) {
		super(
			`Attempted to create a new project but quota is already exhausted. You may have a maximum of ${limit} team projects.`,
		);
	}
}

export class UnlicensedProjectRoleError extends Error {
	constructor(role: ProjectRole) {
		super(`Your instance is not licensed to use role "${role}".`);
	}
}

@Service()
export class ProjectService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly roleService: RoleService,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly cacheService: CacheService,
		private readonly license: License,
	) {}

	private get workflowService() {
		return import('@/workflows/workflow.service').then(({ WorkflowService }) =>
			Container.get(WorkflowService),
		);
	}

	private get credentialsService() {
		return import('@/credentials/credentials.service').then(({ CredentialsService }) =>
			Container.get(CredentialsService),
		);
	}

	async deleteProject(
		user: User,
		projectId: string,
		{ migrateToProject }: { migrateToProject?: string } = {},
	) {
		const workflowService = await this.workflowService;
		const credentialsService = await this.credentialsService;

		if (projectId === migrateToProject) {
			throw new BadRequestError(
				'Request to delete a project failed because the project to delete and the project to migrate to are the same project',
			);
		}

		const project = await this.getProjectWithScope(user, projectId, ['project:delete']);
		if (!project) {
			throw new NotFoundError(`Could not find project with ID: ${projectId}`);
		}

		let targetProject: Project | null = null;
		if (migrateToProject) {
			targetProject = await this.getProjectWithScope(user, migrateToProject, [
				'credential:create',
				'workflow:create',
			]);

			if (!targetProject) {
				throw new NotFoundError(
					`Could not find project to migrate to. ID: ${targetProject}. You may lack permissions to create workflow and credentials in the target project.`,
				);
			}
		}

		// 0. check if this is a team project
		if (project.type !== 'team') {
			throw new ForbiddenError(
				`Can't delete project. Project with ID "${projectId}" is not a team project.`,
			);
		}

		// 1. delete or migrate workflows owned by this project
		const ownedSharedWorkflows = await this.sharedWorkflowRepository.find({
			where: { projectId: project.id, role: 'workflow:owner' },
		});

		if (targetProject) {
			await this.sharedWorkflowRepository.makeOwner(
				ownedSharedWorkflows.map((sw) => sw.workflowId),
				targetProject.id,
			);
		} else {
			for (const sharedWorkflow of ownedSharedWorkflows) {
				await workflowService.delete(user, sharedWorkflow.workflowId);
			}
		}

		// 2. delete credentials owned by this project
		const ownedCredentials = await this.sharedCredentialsRepository.find({
			where: { projectId: project.id, role: 'credential:owner' },
			relations: { credentials: true },
		});

		if (targetProject) {
			await this.sharedCredentialsRepository.makeOwner(
				ownedCredentials.map((sc) => sc.credentialsId),
				targetProject.id,
			);
		} else {
			for (const sharedCredential of ownedCredentials) {
				await credentialsService.delete(sharedCredential.credentials);
			}
		}

		// 3. delete shared credentials into this project
		// Cascading deletes take care of this.

		// 4. delete shared workflows into this project
		// Cascading deletes take care of this.

		// 5. delete project
		await this.projectRepository.remove(project);

		// 6. delete project relations
		// Cascading deletes take care of this.
	}

	/**
	 * Find all the projects where a workflow is accessible,
	 * along with the roles of a user in those projects.
	 */
	async findProjectsWorkflowIsIn(workflowId: string) {
		return await this.sharedWorkflowRepository.findProjectIds(workflowId);
	}

	async getAccessibleProjects(user: User): Promise<Project[]> {
		// This user is probably an admin, show them everything
		if (user.hasGlobalScope('project:read')) {
			return await this.projectRepository.find();
		}
		return await this.projectRepository.getAccessibleProjects(user.id);
	}

	async getPersonalProjectOwners(projectIds: string[]): Promise<ProjectRelation[]> {
		return await this.projectRelationRepository.getPersonalProjectOwners(projectIds);
	}

	async createTeamProject(name: string, adminUser: User, id?: string): Promise<Project> {
		const limit = this.license.getTeamProjectLimit();
		if (
			limit !== UNLIMITED_LICENSE_QUOTA &&
			limit <= (await this.projectRepository.count({ where: { type: 'team' } }))
		) {
			throw new TeamProjectOverQuotaError(limit);
		}

		const project = await this.projectRepository.save(
			this.projectRepository.create({
				id,
				name,
				type: 'team',
			}),
		);

		// Link admin
		await this.addUser(project.id, adminUser.id, 'project:admin');

		return project;
	}

	async updateProject(name: string, projectId: string): Promise<Project> {
		const result = await this.projectRepository.update(
			{
				id: projectId,
				type: 'team',
			},
			{
				name,
			},
		);

		if (!result.affected) {
			throw new ForbiddenError('Project not found');
		}
		return await this.projectRepository.findOneByOrFail({ id: projectId });
	}

	async getPersonalProject(user: User): Promise<Project | null> {
		return await this.projectRepository.getPersonalProjectForUser(user.id);
	}

	async getProjectRelationsForUser(user: User): Promise<ProjectRelation[]> {
		return await this.projectRelationRepository.find({
			where: { userId: user.id },
			relations: ['project'],
		});
	}

	async syncProjectRelations(
		projectId: string,
		relations: Array<{ userId: string; role: ProjectRole }>,
	) {
		const project = await this.projectRepository.findOneOrFail({
			where: { id: projectId, type: Not('personal') },
			relations: { projectRelations: true },
		});

		// Check to see if the instance is licensed to use all roles provided
		for (const r of relations) {
			const existing = project.projectRelations.find((pr) => pr.userId === r.userId);
			// We don't throw an error if the user already exists with that role so
			// existing projects continue working as is.
			if (existing?.role !== r.role && !this.roleService.isRoleLicensed(r.role)) {
				throw new UnlicensedProjectRoleError(r.role);
			}
		}

		await this.projectRelationRepository.manager.transaction(async (em) => {
			await this.pruneRelations(em, project);
			await this.addManyRelations(em, project, relations);
		});
		await this.clearCredentialCanUseExternalSecretsCache(projectId);
	}

	async clearCredentialCanUseExternalSecretsCache(projectId: string) {
		const shares = await this.sharedCredentialsRepository.find({
			where: {
				projectId,
				role: 'credential:owner',
			},
			select: ['credentialsId'],
		});
		if (shares.length) {
			await this.cacheService.deleteMany(
				shares.map((share) => `credential-can-use-secrets:${share.credentialsId}`),
			);
		}
	}

	async pruneRelations(em: EntityManager, project: Project) {
		await em.delete(ProjectRelation, { projectId: project.id });
	}

	async addManyRelations(
		em: EntityManager,
		project: Project,
		relations: Array<{ userId: string; role: ProjectRole }>,
	) {
		await em.insert(
			ProjectRelation,
			relations.map((v) =>
				this.projectRelationRepository.create({
					projectId: project.id,
					userId: v.userId,
					role: v.role,
				}),
			),
		);
	}

	async getProjectWithScope(
		user: User,
		projectId: string,
		scopes: Scope[],
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.projectRepository.manager;
		let where: FindOptionsWhere<Project> = {
			id: projectId,
		};

		if (!user.hasGlobalScope(scopes, { mode: 'allOf' })) {
			const projectRoles = this.roleService.rolesWithScope('project', scopes);

			where = {
				...where,
				projectRelations: {
					role: In(projectRoles),
					userId: user.id,
				},
			};
		}

		return await em.findOne(Project, {
			where,
		});
	}

	async addUser(projectId: string, userId: string, role: ProjectRole) {
		return await this.projectRelationRepository.save({
			projectId,
			userId,
			role,
		});
	}

	async getProject(projectId: string): Promise<Project> {
		return await this.projectRepository.findOneOrFail({
			where: {
				id: projectId,
			},
		});
	}

	async getProjectRelations(projectId: string): Promise<ProjectRelation[]> {
		return await this.projectRelationRepository.find({
			where: { projectId },
			relations: { user: true },
		});
	}

	async getUserOwnedOrAdminProjects(userId: string): Promise<Project[]> {
		return await this.projectRepository.find({
			where: {
				projectRelations: {
					userId,
					role: In(['project:personalOwner', 'project:admin']),
				},
			},
		});
	}

	async getProjectCounts(): Promise<Record<ProjectType, number>> {
		return await this.projectRepository.getProjectCounts();
	}
}
