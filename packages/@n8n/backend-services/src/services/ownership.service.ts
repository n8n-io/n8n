import type { ListQueryDb } from '@n8n/db';
import {
	GLOBAL_OWNER_ROLE,
	Project,
	ProjectRelationRepository,
	ProjectRepository,
	Role,
	Scope,
	SharedWorkflowRepository,
	User,
	UserRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { CacheService } from './cache/cache.service';

@Service()
export class OwnershipService {
	constructor(
		private cacheService: CacheService,
		private projectRelationRepository: ProjectRelationRepository,
		private projectRepository: ProjectRepository,
		private sharedWorkflowRepository: SharedWorkflowRepository,
		private userRepository: UserRepository,
	) {}

	// To make use of the cache service we should store POJOs, these
	// methods should be used to create copies of the entities
	// converting them into plain JavaScript objects
	// Ideally our data entities wouldn't be classes, but plain
	// interfaces and therefore pojos adhering to these interfaces
	copyProject(project: Project): Partial<Project> {
		return {
			...project,
		};
	}

	reconstructProject(project: Partial<Project>): Project | undefined {
		if (typeof project !== 'object' || project === null) {
			return undefined;
		}
		return Object.assign(new Project(), project);
	}

	copyUser(user: User): Partial<User> {
		return {
			...user,
			role: { ...user.role, scopes: [...user.role.scopes] },
		};
	}

	reconstructUser(cachedUser: Partial<User>): User | undefined {
		if (typeof cachedUser !== 'object' || cachedUser === null) {
			// performing runtime checks here, because the data is originating from
			// an external system our cache
			return undefined;
		}
		const user = Object.assign(new User(), cachedUser);
		if ('role' in cachedUser && cachedUser.role && typeof cachedUser.role === 'object') {
			user.role = Object.assign(new Role(), cachedUser.role);
			if ('scopes' in cachedUser.role && Array.isArray(cachedUser.role.scopes)) {
				user.role.scopes = cachedUser.role.scopes.map((scope) => {
					const x = Object.assign(new Scope(), scope);
					return x;
				});
			}
			return user;
		}
		// we need the role on the user, if this is missing, we should invalidate the cache and reload
		return undefined;
	}

	/**
	 * Retrieve the project that owns the workflow. The result is cached. Workflow
	 * ownership can change in bulk (e.g. when a user is deleted and their resources
	 * are transferred), so any bulk owner change must invalidate this cache via
	 * {@link invalidateWorkflowProjectCacheByIds} afterwards.
	 */
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
			[workflowId]: this.copyProject(sharedWorkflow.project),
		});

		return sharedWorkflow.project;
	}

	async setWorkflowProjectCacheEntry(workflowId: string, project: Project): Promise<Project> {
		void this.cacheService.setHash('workflow-project', {
			[workflowId]: this.copyProject(project),
		});

		return project;
	}

	/**
	 * Retrieve the user who owns the personal project, or `null` if non-personal project.
	 * Personal project ownership is **immutable**.
	 */
	async getPersonalProjectOwnerCached(projectId: string): Promise<User | null> {
		const owners = await this.getPersonalProjectOwnersCached([projectId]);
		return owners.get(projectId) ?? null;
	}

	async getPersonalProjectOwnersCached(projectIds: string[]): Promise<Map<string, User>> {
		const ownerByProjectId = new Map<string, User>();
		const cacheResults = await Promise.all(
			[...new Set(projectIds)].map(async (projectId) => {
				const cachedValue = await this.cacheService.getHashValue<Partial<User>>(
					'project-owner',
					projectId,
				);
				return {
					projectId,
					owner: cachedValue ? this.reconstructUser(cachedValue) : undefined,
				};
			}),
		);
		for (const { projectId, owner } of cacheResults) {
			if (owner) ownerByProjectId.set(projectId, owner);
		}
		const projectIdsToFetch = cacheResults
			.filter(({ owner }) => !owner)
			.map(({ projectId }) => projectId);

		if (projectIdsToFetch.length === 0) return ownerByProjectId;

		const ownerRelations =
			await this.projectRelationRepository.getPersonalProjectOwners(projectIdsToFetch);
		const ownersToCache: Record<string, Partial<User>> = {};
		for (const { projectId, user } of ownerRelations) {
			ownerByProjectId.set(projectId, user);
			ownersToCache[projectId] = this.copyUser(user);
		}
		void this.cacheService.setHash('project-owner', ownersToCache);

		return ownerByProjectId;
	}

	async invalidateProjectOwnerCacheByUserId(userId: string) {
		const personalProject = await this.projectRepository.getPersonalProjectForUser(userId);
		if (personalProject) {
			await this.cacheService.deleteFromHash('project-owner', personalProject.id);
		}
	}

	async invalidateWorkflowProjectCacheForProject(projectId: string): Promise<void> {
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

	/**
	 * Invalidate the cached project for specific workflows. Use after a bulk
	 * ownership change where the workflow IDs are already known and their
	 * `workflow:owner` rows have moved to a different project.
	 */
	async invalidateWorkflowProjectCacheByIds(workflowIds: string[]): Promise<void> {
		await Promise.all(
			workflowIds.map(
				async (workflowId) =>
					await this.cacheService.deleteFromHash('workflow-project', workflowId),
			),
		);
	}

	addOwnedByAndSharedWith(
		rawWorkflow: ListQueryDb.Workflow.WithSharing,
	): ListQueryDb.Workflow.WithOwnedByAndSharedWith;
	addOwnedByAndSharedWith(
		rawCredential: ListQueryDb.Credentials.WithSharing,
	): ListQueryDb.Credentials.WithOwnedByAndSharedWith;
	addOwnedByAndSharedWith(
		rawEntity: ListQueryDb.Workflow.WithSharing | ListQueryDb.Credentials.WithSharing,
	):
		| ListQueryDb.Workflow.WithOwnedByAndSharedWith
		| ListQueryDb.Credentials.WithOwnedByAndSharedWith {
		const shared = rawEntity.shared;
		const entity = rawEntity as
			| ListQueryDb.Workflow.WithOwnedByAndSharedWith
			| ListQueryDb.Credentials.WithOwnedByAndSharedWith;

		Object.assign(entity, {
			homeProject: null,
			sharedWithProjects: [],
		});

		if (shared === undefined) {
			return entity;
		}

		for (const sharedEntity of shared) {
			const { project, role } = sharedEntity;

			if (role === 'credential:owner' || role === 'workflow:owner') {
				entity.homeProject = {
					id: project.id,
					type: project.type,
					name: project.name,
					icon: project.icon,
				};
			} else {
				entity.sharedWithProjects.push({
					id: project.id,
					type: project.type,
					name: project.name,
					icon: project.icon,
				});
			}
		}

		return entity;
	}

	async getInstanceOwner() {
		return await this.userRepository.findOneOrFail({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			// Permission checks read `user.role`. Without it, they show the owner
			// less than they should, and report no error.
			relations: ['role'],
		});
	}

	async hasInstanceOwner() {
		return await this.userRepository.hasClaimedInstanceOwner();
	}
}
