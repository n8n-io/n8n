import type { ListQueryDb } from '@n8n/db';
import {
	GLOBAL_OWNER_ROLE,
	Project,
	User,
	ProjectRelationRepository,
	SharedWorkflowRepository,
	UserRepository,
	Role,
	Scope,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { CacheService } from '@/services/cache/cache.service';
import { jsonParse } from 'n8n-workflow';

@Service()
export class OwnershipService {
	constructor(
		private cacheService: CacheService,
		private userRepository: UserRepository,
		private projectRelationRepository: ProjectRelationRepository,
		private sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	// These serialization methods are used to convert entities to and from their JSON representation
	// We should refactor the cache service to require the caller to provide the serialization logic
	// in that case the cache service could optimize away the serialization, in case it uses in memory caching
	// This should be addressed an a future PR.
	serializeProject(project: Project): string {
		return JSON.stringify(project);
	}

	deserializeProject(serialized: string): Project | undefined {
		const object = jsonParse(serialized);
		if (typeof object !== 'object' || object === null) {
			return undefined;
		}
		return Object.assign(new Project(), object);
	}

	serializeUser(user: User): string {
		return JSON.stringify(user);
	}

	deserializeUser(serialized: string): User | undefined {
		const object = jsonParse(serialized);
		if (typeof object !== 'object' || object === null) {
			return undefined;
		}
		const user = Object.assign(new User(), object);
		if ('role' in object && object.role && typeof object.role === 'object') {
			user.role = Object.assign(new Role(), object.role);
			if ('scopes' in object.role && Array.isArray(object.role.scopes)) {
				user.role.scopes = object.role.scopes.map((scope) => {
					const x = Object.assign(new Scope(), scope) as Scope;
					return x;
				});
			}
			return user;
		}
		// we need the role on the user, if this is missing, we should invalidate the cache and reload
		return undefined;
	}

	/**
	 * Retrieve the project that owns the workflow. Note that workflow ownership is **immutable**.
	 */
	async getWorkflowProjectCached(workflowId: string): Promise<Project> {
		const cachedValue = await this.cacheService.getHashValue<string>(
			'workflow-project',
			workflowId,
		);

		if (cachedValue) {
			const project = this.deserializeProject(cachedValue);
			if (project) return project;
		}

		const sharedWorkflow = await this.sharedWorkflowRepository.findOneOrFail({
			where: { workflowId, role: 'workflow:owner' },
			relations: ['project'],
		});

		void this.cacheService.setHash('workflow-project', {
			[workflowId]: this.serializeProject(sharedWorkflow.project),
		});

		return sharedWorkflow.project;
	}

	/**
	 * Retrieve the user who owns the personal project, or `null` if non-personal project.
	 * Personal project ownership is **immutable**.
	 */
	async getPersonalProjectOwnerCached(projectId: string): Promise<User | null> {
		const cachedValue = await this.cacheService.getHashValue<string>('project-owner', projectId);

		if (cachedValue) {
			const user = this.deserializeUser(cachedValue);
			if (user) return user;
		}

		const ownerRel = await this.projectRelationRepository.getPersonalProjectOwners([projectId]);
		const owner = ownerRel[0]?.user ?? null;
		void this.cacheService.setHash('project-owner', { [projectId]: this.serializeUser(owner) });

		return owner;
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
		});
	}
}
