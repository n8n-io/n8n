import type { CreateProjectDto, ProjectType, UpdateProjectDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { DatabaseConfig } from '@n8n/config';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import type { User } from '@n8n/db';
import {
	Project,
	ProjectRelation,
	ProjectRelationRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { hasGlobalScope, rolesWithScope, type Scope, type ProjectRole } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { FindOptionsWhere, EntityManager } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { CacheService } from './cache/cache.service';
import { RoleService } from './role.service';

type Relation = Pick<ProjectRelation, 'userId' | 'role'>;

export class TeamProjectOverQuotaError extends UserError {
	constructor(limit: number) {
		super(
			`Attempted to create a new project but quota is already exhausted. You may have a maximum of ${limit} team projects.`,
		);
	}
}

export class UnlicensedProjectRoleError extends UserError {
	constructor(role: ProjectRole) {
		super(`Your instance is not licensed to use role "${role}".`);
	}
}

class ProjectNotFoundError extends NotFoundError {
	constructor(projectId: string) {
		super(`Could not find project with ID: ${projectId}`);
	}

	static isDefinedAndNotNull<T>(
		value: T | undefined | null,
		projectId: string,
	): asserts value is T {
		if (value === undefined || value === null) {
			throw new ProjectNotFoundError(projectId);
		}
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
		private readonly licenseState: LicenseState,
		private readonly databaseConfig: DatabaseConfig,
	) {}

	private get workflowService() {
		// eslint-disable-next-line import-x/no-cycle
		return import('@/workflows/workflow.service').then(({ WorkflowService }) =>
			Container.get(WorkflowService),
		);
	}

	private get credentialsService() {
		// eslint-disable-next-line import-x/no-cycle
		return import('@/credentials/credentials.service').then(({ CredentialsService }) =>
			Container.get(CredentialsService),
		);
	}

	private get folderService() {
		return import('@/services/folder.service').then(({ FolderService }) =>
			Container.get(FolderService),
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
		ProjectNotFoundError.isDefinedAndNotNull(project, projectId);

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
				await workflowService.delete(user, sharedWorkflow.workflowId, true);
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
				await credentialsService.delete(user, sharedCredential.credentials.id);
			}
		}

		// 3. Move folders over to the target project, before deleting the project else cascading will delete workflows
		if (targetProject) {
			const folderService = await this.folderService;
			await folderService.transferAllFoldersToProject(project.id, targetProject.id);
		}

		// 4. delete shared credentials into this project
		// Cascading deletes take care of this.

		// 5. delete shared workflows into this project
		// Cascading deletes take care of this.

		// 6. delete project
		await this.projectRepository.remove(project);

		// 7. delete project relations
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
		if (hasGlobalScope(user, 'project:read')) {
			return await this.projectRepository.find();
		}
		return await this.projectRepository.getAccessibleProjects(user.id);
	}

	async getPersonalProjectOwners(projectIds: string[]): Promise<ProjectRelation[]> {
		return await this.projectRelationRepository.getPersonalProjectOwners(projectIds);
	}

	private async createTeamProjectWithEntityManager(
		adminUser: User,
		data: CreateProjectDto,
		trx: EntityManager,
	) {
		const limit = this.licenseState.getMaxTeamProjects();
		if (limit !== UNLIMITED_LICENSE_QUOTA) {
			const teamProjectCount = await trx.count(Project, { where: { type: 'team' } });
			if (teamProjectCount >= limit) {
				throw new TeamProjectOverQuotaError(limit);
			}
		}

		const project = await trx.save(
			Project,
			this.projectRepository.create({ ...data, type: 'team' }),
		);

		// Link admin
		await this.addUser(project.id, { userId: adminUser.id, role: 'project:admin' }, trx);

		return project;
	}

	async createTeamProject(adminUser: User, data: CreateProjectDto): Promise<Project> {
		if (this.databaseConfig.isLegacySqlite) {
			// Using transaction in the sqlite legacy driver can cause data loss, so
			// we avoid this here.
			return await this.createTeamProjectWithEntityManager(
				adminUser,
				data,
				this.projectRepository.manager,
			);
		} else {
			// This needs to be SERIALIZABLE otherwise the count would not block a
			// concurrent transaction and we could insert multiple projects.
			return await this.projectRepository.manager.transaction('SERIALIZABLE', async (trx) => {
				return await this.createTeamProjectWithEntityManager(adminUser, data, trx);
			});
		}
	}

	async updateProject(
		projectId: string,
		{ name, icon, description }: UpdateProjectDto,
	): Promise<void> {
		const result = await this.projectRepository.update(
			{ id: projectId, type: 'team' },
			{ name, icon, description },
		);
		if (!result.affected) {
			throw new ProjectNotFoundError(projectId);
		}
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
		relations: Required<UpdateProjectDto>['relations'],
	): Promise<{ project: Project; newRelations: Required<UpdateProjectDto>['relations'] }> {
		const project = await this.getTeamProjectWithRelations(projectId);
		this.checkRolesLicensed(project, relations);

		await this.projectRelationRepository.manager.transaction(async (em) => {
			await this.pruneRelations(em, project);
			await this.addManyRelations(em, project, relations);
		});

		const newRelations = relations.filter(
			(relation) => !project.projectRelations.some((r) => r.userId === relation.userId),
		);
		await this.clearCredentialCanUseExternalSecretsCache(projectId);

		return { project, newRelations };
	}

	/**
	 * Adds users to a team project with specified roles.
	 *
	 * Throws if you the project is a personal project.
	 * Throws if the relations contain `project:personalOwner`.
	 */
	async addUsersToProject(projectId: string, relations: Relation[]) {
		const project = await this.getTeamProjectWithRelations(projectId);
		this.checkRolesLicensed(project, relations);

		if (project.type === 'personal') {
			throw new ForbiddenError("Can't add users to personal projects.");
		}

		if (relations.some((r) => r.role === 'project:personalOwner')) {
			throw new ForbiddenError("Can't add a personalOwner to a team project.");
		}

		await this.projectRelationRepository.save(
			relations.map((relation) => ({ projectId, ...relation })),
		);
	}

	private async getTeamProjectWithRelations(projectId: string) {
		const project = await this.projectRepository.findOne({
			where: { id: projectId, type: 'team' },
			relations: { projectRelations: true },
		});
		ProjectNotFoundError.isDefinedAndNotNull(project, projectId);
		return project;
	}

	/** Check to see if the instance is licensed to use all roles provided */
	private checkRolesLicensed(project: Project, relations: Relation[]) {
		for (const { role, userId } of relations) {
			const existing = project.projectRelations.find((pr) => pr.userId === userId);
			// We don't throw an error if the user already exists with that role so
			// existing projects continue working as is.
			if (existing?.role !== role && !this.roleService.isRoleLicensed(role)) {
				throw new UnlicensedProjectRoleError(role);
			}
		}
	}

	private isUserProjectOwner(project: Project, userId: string) {
		return project.projectRelations.some(
			(pr) => pr.userId === userId && pr.role === 'project:personalOwner',
		);
	}

	async deleteUserFromProject(projectId: string, userId: string) {
		const project = await this.getTeamProjectWithRelations(projectId);

		// Prevent project owner from being removed
		if (this.isUserProjectOwner(project, userId)) {
			throw new ForbiddenError('Project owner cannot be removed from the project');
		}

		await this.projectRelationRepository.delete({ projectId: project.id, userId });
	}

	async changeUserRoleInProject(projectId: string, userId: string, role: ProjectRole) {
		if (role === 'project:personalOwner') {
			throw new ForbiddenError('Personal owner cannot be added to a team project.');
		}

		const project = await this.getTeamProjectWithRelations(projectId);
		ProjectNotFoundError.isDefinedAndNotNull(project, projectId);

		const projectUserExists = project.projectRelations.some((r) => r.userId === userId);
		if (!projectUserExists) {
			throw new ProjectNotFoundError(projectId);
		}

		await this.projectRelationRepository.update({ projectId, userId }, { role });
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
			// @ts-ignore CAT-957
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

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const projectRoles = rolesWithScope('project', scopes);

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

	/**
	 * Add a user to a team project with specified roles.
	 *
	 * Throws if you the project is a personal project.
	 * Throws if the relations contain `project:personalOwner`.
	 */
	async addUser(projectId: string, { userId, role }: Relation, trx?: EntityManager) {
		trx = trx ?? this.projectRelationRepository.manager;
		return await trx.save(ProjectRelation, {
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
