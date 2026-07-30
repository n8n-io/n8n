import type { CreateProjectDto, ProjectType, UpdateProjectDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import {
	type User,
	Project,
	ProjectRelation,
	ProjectRelationRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	type ProjectListOptions,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import {
	combineScopes,
	getAuthPrincipalScopes,
	hasGlobalScope,
	type Scope,
	AssignableProjectRole,
	PROJECT_OWNER_ROLE_SLUG,
	PROJECT_ADMIN_ROLE_SLUG,
	isAssignableProjectRoleSlug,
} from '@n8n/permissions';
import type { FindOptionsWhere, EntityManager } from '@n8n/typeorm';
import { In } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { OwnershipService } from './ownership.service';
import { RoleService } from './role.service';

export class TeamProjectOverQuotaError extends UserError {
	constructor(limit: number) {
		super(
			`Attempted to create a new project but quota is already exhausted. You may have a maximum of ${limit} team projects.`,
		);
	}
}

export class UnlicensedProjectRoleError extends UserError {
	constructor(role: AssignableProjectRole) {
		super(`Your instance is not licensed to use role "${role}".`);
	}
}

export class ProjectNotFoundError extends NotFoundError {
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

export interface ProjectCreateOverrides {
	id?: string;
	description?: string | null;
	customTelemetryTags?: Array<{ key: string; value: string }>;
}

@Service()
export class ProjectService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly roleService: RoleService,
		private readonly licenseState: LicenseState,
		private readonly ownershipService: OwnershipService,
	) {}

	private get connectionStatusProxy() {
		return import('@/credentials/credential-connection-status-proxy.js').then(
			({ CredentialConnectionStatusProxy }) => Container.get(CredentialConnectionStatusProxy),
		);
	}

	/**
	 * Find all the projects where a workflow is accessible,
	 * along with the roles of a user in those projects.
	 */
	async findProjectsWorkflowIsIn(workflowId: string) {
		return await this.sharedWorkflowRepository.findProjectIds(workflowId);
	}

	/**
	 * Enrich projects with the requesting user's role and scopes.
	 * Mirrors the logic in getMyProjects controller: for each project,
	 * find the user's ProjectRelation and combine global + project scopes.
	 */
	async addUserScopes(
		user: User,
		projects: Project[],
	): Promise<Array<Project & { role: string; scopes: Scope[] }>> {
		if (projects.length === 0) return [];

		const relations = await this.projectRelationRepository.find({
			where: {
				userId: user.id,
				projectId: In(projects.map((p) => p.id)),
			},
			relations: ['role'],
		});
		const relationsByProject = new Map(relations.map((r) => [r.projectId, r]));
		const globalScopes = getAuthPrincipalScopes(user);

		return projects.map((project) => {
			const relation = relationsByProject.get(project.id);
			const projectScopes = relation?.role?.scopes?.map((s) => s.slug) ?? [];
			return Object.assign(project, {
				role: relation?.role?.slug ?? user.role.slug,
				scopes: [
					...new Set(
						combineScopes({
							global: globalScopes,
							...(projectScopes.length ? { project: projectScopes } : {}),
						}),
					),
				].sort(),
			});
		});
	}

	async getAccessibleProjects(user: User): Promise<Project[]> {
		// This user is probably an admin, show them everything
		if (hasGlobalScope(user, 'project:read')) {
			return await this.projectRepository.find();
		}
		return await this.projectRepository.getAccessibleProjects(user.id);
	}

	async getAccessibleProjectsAndCount(
		user: User,
		options: ProjectListOptions,
	): Promise<[Project[], number]> {
		if (hasGlobalScope(user, 'project:read')) {
			return await this.projectRepository.findAllProjectsAndCount(options);
		}
		return await this.projectRepository.getAccessibleProjectsAndCount(user.id, options);
	}

	// Returns the projects a caller can pick as share targets, including peer
	// personal projects. Admins (project:read) still see everything; non-admin
	// callers also see all personal projects so the share dropdown can surface
	// other users. See `ProjectRepository.getShareableProjectsAndCount`.
	async getShareableProjectsAndCount(
		user: User,
		options: ProjectListOptions,
	): Promise<[Project[], number]> {
		if (hasGlobalScope(user, 'project:read')) {
			return await this.projectRepository.findAllProjectsAndCount(options);
		}
		return await this.projectRepository.getShareableProjectsAndCount(user.id, options);
	}

	async getPersonalProjectOwners(projectIds: string[]): Promise<ProjectRelation[]> {
		return await this.projectRelationRepository.getPersonalProjectOwners(projectIds);
	}

	private async createTeamProjectWithEntityManager(
		adminUser: User,
		data: CreateProjectDto,
		trx: EntityManager,
		overrides: ProjectCreateOverrides = {},
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
			this.projectRepository.create({
				...data,
				...overrides,
				type: 'team',
				creatorId: adminUser.id,
			}),
		);

		// Link admin
		await this.addUser(project.id, { userId: adminUser.id, role: 'project:admin' }, trx);

		return project;
	}

	async createTeamProject(
		adminUser: User,
		data: CreateProjectDto,
		overrides: ProjectCreateOverrides = {},
	): Promise<Project> {
		// This needs to be SERIALIZABLE otherwise the count would not block a
		// concurrent transaction and we could insert multiple projects.
		return await this.projectRepository.manager.transaction('SERIALIZABLE', async (trx) => {
			return await this.createTeamProjectWithEntityManager(adminUser, data, trx, overrides);
		});
	}

	async updateProject(
		projectId: string,
		{ name, icon, description, customTelemetryTags }: UpdateProjectDto,
	): Promise<void> {
		const trimmedTags = customTelemetryTags
			?.map(({ key, value }) => ({ key: key.trim(), value }))
			.filter(({ key }) => key !== '');

		const result = await this.projectRepository.update(
			{ id: projectId, type: 'team' },
			{ name, icon, description, customTelemetryTags: trimmedTags },
		);
		if (!result.affected) {
			throw new ProjectNotFoundError(projectId);
		}

		// Ensure OTel spans pick up the updated customTelemetryTags on the next execution.
		await this.ownershipService.invalidateWorkflowProjectCacheForProject(projectId);
	}

	async getPersonalProject(user: User): Promise<Project | null> {
		return await this.projectRepository.getPersonalProjectForUser(user.id);
	}

	async getProjectRelationsForUser(user: User): Promise<ProjectRelation[]> {
		return await this.projectRelationRepository.find({
			where: { userId: user.id },
			relations: ['project', 'role'],
		});
	}

	async syncProjectRelations(
		projectId: string,
		relations: Array<{ role: AssignableProjectRole; userId: string }>,
	): Promise<{
		project: Project;
		newRelations: Array<{ role: AssignableProjectRole; userId: string }>;
	}> {
		const project = await this.getTeamProjectWithRelations(projectId);
		this.checkRolesLicensed(project, relations);

		// Check that all roles exist
		await this.roleService.checkRolesExist(
			relations.map((r) => r.role),
			'project',
		);

		const incomingByUserId = new Map(relations.map((r) => [r.userId, r.role]));

		const removedUserIds = project.projectRelations
			.filter((r) => !incomingByUserId.has(r.userId))
			.map((r) => r.userId);

		// Users whose role slug changed — a downgrade may strip credential:update,
		// so their per-user credential entries must be re-evaluated too.
		const roleChangedUserIds = project.projectRelations
			.filter((r) => {
				const newRole = incomingByUserId.get(r.userId);
				return newRole !== undefined && newRole !== r.role.slug;
			})
			.map((r) => r.userId);

		const affectedUserIds = [...new Set([...removedUserIds, ...roleChangedUserIds])];

		const proxy = await this.connectionStatusProxy;

		await this.projectRelationRepository.manager.transaction(async (em) => {
			await this.pruneRelations(em, project);
			await this.addManyRelations(em, project, relations);

			if (affectedUserIds.length > 0) {
				await proxy.cleanupOrphanedEntriesForUsers(affectedUserIds, em);
			}
		});

		const newRelations = relations.filter(
			(relation) => !project.projectRelations.some((r) => r.userId === relation.userId),
		);

		return { project, newRelations };
	}

	/**
	 * Adds users to a team project with specified roles.
	 *
	 * Throws if you the project is a personal project.
	 * Throws if the relations contain `project:personalOwner`.
	 */
	async addUsersToProject(
		projectId: string,
		relations: Array<{ userId: string; role: AssignableProjectRole }>,
	) {
		const project = await this.getTeamProjectWithRelations(projectId);
		this.checkRolesLicensed(project, relations);

		// Check that project role exists
		await this.roleService.checkRolesExist(
			relations.map((r) => r.role),
			'project',
		);

		if (project.type === 'personal') {
			throw new ForbiddenError("Can't add users to personal projects.");
		}

		if (relations.some((r) => r.role === PROJECT_OWNER_ROLE_SLUG)) {
			throw new ForbiddenError("Can't add a personalOwner to a team project.");
		}

		await this.projectRelationRepository.save(
			relations.map((relation) => ({
				projectId,
				userId: relation.userId,
				role: { slug: relation.role },
			})),
		);
	}

	/**
	 * Add users with conflict semantics:
	 * - Adds users that are not already members
	 * - No-ops for users already in the project with the same role
	 * - Reports conflicts for users already in the project with a different role (no change)
	 */
	async addUsersWithConflictSemantics(
		projectId: string,
		relations: Array<{ userId: string; role: AssignableProjectRole }>,
	): Promise<{
		project: Project;
		added: Array<{ userId: string; role: AssignableProjectRole }>;
		conflicts: Array<{
			userId: string;
			currentRole: AssignableProjectRole;
			requestedRole: AssignableProjectRole;
		}>;
	}> {
		const project = await this.getTeamProjectWithRelations(projectId);
		this.checkRolesLicensed(project, relations);

		// Validate roles exist
		await this.roleService.checkRolesExist(
			relations.map((r) => r.role),
			'project',
		);

		const existingByUserId = new Map(project.projectRelations.map((r) => [r.userId, r]));
		const added: Array<{ userId: string; role: AssignableProjectRole }> = [];
		const conflicts: Array<{
			userId: string;
			currentRole: AssignableProjectRole;
			requestedRole: AssignableProjectRole;
		}> = [];

		for (const rel of relations) {
			const existing = existingByUserId.get(rel.userId);
			if (!existing) continue; // will be inserted below
			const current = existing.role?.slug;
			if (current && current !== rel.role && isAssignableProjectRoleSlug(current)) {
				conflicts.push({ userId: rel.userId, currentRole: current, requestedRole: rel.role });
			}
		}

		// Insert only non-existing users
		const toInsert = relations.filter((rel) => !existingByUserId.has(rel.userId));
		if (toInsert.length > 0) {
			// Use insert to avoid accidental upsert of different role
			await this.projectRelationRepository.insert(
				toInsert.map((v) => ({
					projectId: project.id,
					userId: v.userId,
					role: { slug: v.role },
				})),
			);
			added.push(...toInsert);
		}

		return { project, added, conflicts };
	}

	private async getTeamProjectWithRelations(projectId: string) {
		const project = await this.projectRepository.findOne({
			where: { id: projectId, type: 'team' },
			relations: { projectRelations: { role: true } },
		});
		ProjectNotFoundError.isDefinedAndNotNull(project, projectId);
		return project;
	}

	/** Check to see if the instance is licensed to use all roles provided */
	private checkRolesLicensed(
		project: Project,
		relations: Array<{ role: AssignableProjectRole; userId: string }>,
	) {
		for (const { role, userId } of relations) {
			const existing = project.projectRelations.find((pr) => pr.userId === userId);
			// We don't throw an error if the user already exists with that role so
			// existing projects continue working as is.
			if (existing?.role?.slug !== role && !this.roleService.isRoleLicensed(role)) {
				throw new UnlicensedProjectRoleError(role);
			}
		}
	}

	private isUserProjectOwner(project: Project, userId: string) {
		return project.projectRelations.some(
			(pr) => pr.userId === userId && pr.role.slug === PROJECT_OWNER_ROLE_SLUG,
		);
	}

	async deleteUserFromProject(projectId: string, userId: string) {
		const project = await this.getTeamProjectWithRelations(projectId);

		// Prevent project owner from being removed
		if (this.isUserProjectOwner(project, userId)) {
			throw new ForbiddenError('Project owner cannot be removed from the project');
		}

		const proxy = await this.connectionStatusProxy;

		await this.projectRelationRepository.manager.transaction(async (em) => {
			await em.delete(ProjectRelation, { projectId: project.id, userId });
			await proxy.cleanupOrphanedEntriesForUsers([userId], em);
		});
	}

	async changeUserRoleInProject(projectId: string, userId: string, role: AssignableProjectRole) {
		if (role === PROJECT_OWNER_ROLE_SLUG) {
			throw new ForbiddenError('Personal owner cannot be added to a team project.');
		}

		const project = await this.getTeamProjectWithRelations(projectId);

		// Check that project role exists
		await this.roleService.checkRolesExist([role], 'project');

		ProjectNotFoundError.isDefinedAndNotNull(project, projectId);

		const projectUserExists = project.projectRelations.some((r) => r.userId === userId);
		if (!projectUserExists) {
			throw new ProjectNotFoundError(projectId);
		}

		// License check: only allow change to roles that are licensed
		const currentRelation = project.projectRelations.find((r) => r.userId === userId);
		const currentRole = currentRelation?.role?.slug;
		if (currentRole !== role && !this.roleService.isRoleLicensed(role)) {
			throw new UnlicensedProjectRoleError(role);
		}

		const proxy = await this.connectionStatusProxy;

		await this.projectRelationRepository.manager.transaction(async (em) => {
			await em.update(ProjectRelation, { projectId, userId }, { role: { slug: role } });
			await proxy.cleanupOrphanedEntriesForUsers([userId], em);
		});
	}

	async pruneRelations(em: EntityManager, project: Project) {
		await em.delete(ProjectRelation, { projectId: project.id });
	}

	async addManyRelations(
		em: EntityManager,
		project: Project,
		relations: Array<{ userId: string; role: AssignableProjectRole }>,
	) {
		await em.insert(
			ProjectRelation,
			relations.map((v) =>
				this.projectRelationRepository.create({
					projectId: project.id,
					userId: v.userId,
					role: { slug: v.role },
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
			// Use the same EntityManager as the project lookup (including when callers pass a
			// transaction manager). Otherwise role resolution can open a second pooled connection
			// while a transaction already holds a connection
			const projectRoles = await this.roleService.rolesWithScope('project', scopes, em);

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

	async getProjectIdsWithScope(user: User, scopes: Scope[], projectIds?: string[]) {
		const where: FindOptionsWhere<Project> = {};
		if (projectIds) {
			where.id = In(projectIds);
		}

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const projectRoles = await this.roleService.rolesWithScope('project', scopes);
			// if we're not checking specific projects, restrict to team projects
			if (!projectIds) {
				where.type = 'team';
			}
			where.projectRelations = {
				role: In(projectRoles),
				userId: user.id,
			};
		}

		const projects = await this.projectRepository.find({
			where,
			select: ['id'],
		});
		return projects.map((p) => p.id);
	}

	async findExistingProjectIds(projectIds: string[]): Promise<Set<string>> {
		if (projectIds.length === 0) return new Set();
		const projects = await this.projectRepository.find({
			select: ['id'],
			where: { id: In(projectIds) },
		});
		return new Set(projects.map(({ id }) => id));
	}

	async findProjectsByIdsForUser(
		user: User,
		projectIds: string[],
		scopes: Scope[],
	): Promise<Project[]> {
		if (projectIds.length === 0) {
			return [];
		}

		const where: FindOptionsWhere<Project> = {
			id: In(projectIds),
		};

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const projectRoles = await this.roleService.rolesWithScope('project', scopes);
			where.projectRelations = {
				role: In(projectRoles),
				userId: user.id,
			};
		}

		return await this.projectRepository.find({
			where,
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	/**
	 * Add a user to a team project with specified roles.
	 *
	 * Throws if you the project is a personal project.
	 * Throws if the relations contain `project:personalOwner`.
	 */
	async addUser(
		projectId: string,
		{ userId, role }: { userId: string; role: AssignableProjectRole },
		trx?: EntityManager,
	) {
		trx = trx ?? this.projectRelationRepository.manager;
		return await trx.save(ProjectRelation, {
			projectId,
			userId,
			role: { slug: role },
		});
	}

	async getProject(projectId: string): Promise<Project> {
		return await this.projectRepository.findOneOrFail({
			where: {
				id: projectId,
			},
		});
	}

	/** Finds a project by id, or `null` when it does not exist. */
	async findProject(projectId: string): Promise<Project | null> {
		return await this.projectRepository.findOne({ where: { id: projectId } });
	}

	async getProjectRelations(projectId: string): Promise<ProjectRelation[]> {
		return await this.projectRelationRepository.find({
			where: { projectId },
			relations: { user: true, role: true },
		});
	}

	async getProjectRelationForUserAndProject(
		userId: string,
		projectId: string,
	): Promise<ProjectRelation | null> {
		return await this.projectRelationRepository.findOne({
			where: { projectId, userId },
			relations: { user: true, role: true },
		});
	}

	async getUserOwnedOrAdminProjects(userId: string): Promise<Project[]> {
		return await this.projectRepository.find({
			where: {
				projectRelations: {
					userId,
					role: In([PROJECT_OWNER_ROLE_SLUG, PROJECT_ADMIN_ROLE_SLUG]),
				},
			},
		});
	}

	async getProjectCounts(): Promise<Record<ProjectType, number>> {
		return await this.projectRepository.getProjectCounts();
	}
}
