import type { ListQueryDb } from '@n8n/db';
import {
	GLOBAL_OWNER_ROLE,
	Project,
	User,
	ProjectRelationRepository,
	SharedWorkflowRepository,
	UserRepository,
	Role,
	SettingsRepository,
	Scope,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { CacheService } from '@/services/cache/cache.service';
import { OwnerSetupRequestDto } from '@n8n/api-types';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { PasswordUtility } from './password.utility';
import { IsNull } from '@n8n/typeorm/find-options/operator/IsNull';
import { Not } from '@n8n/typeorm/find-options/operator/Not';
import config from '@/config';

@Service()
export class OwnershipService {
	constructor(
		private cacheService: CacheService,
		private eventService: EventService,
		private logger: Logger,
		private passwordUtility: PasswordUtility,
		private projectRelationRepository: ProjectRelationRepository,
		private sharedWorkflowRepository: SharedWorkflowRepository,
		private userRepository: UserRepository,
		private settingsRepository: SettingsRepository,
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
	 * Retrieve the project that owns the workflow. Note that workflow ownership is **immutable**.
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
		const cachedValue = await this.cacheService.getHashValue<Partial<User>>(
			'project-owner',
			projectId,
		);

		if (cachedValue) {
			const user = this.reconstructUser(cachedValue);
			if (user) return user;
		}

		const ownerRel = await this.projectRelationRepository.getPersonalProjectOwners([projectId]);
		const owner = ownerRel[0]?.user ?? null;
		if (owner) {
			void this.cacheService.setHash('project-owner', { [projectId]: this.copyUser(owner) });
		}

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

	async hasInstanceOwner() {
		return await this.userRepository.exists({
			where: [
				{
					role: { slug: GLOBAL_OWNER_ROLE.slug },
					// We use this to avoid selecting the "shell" user
					lastActiveAt: Not(IsNull()),
				},
				// OR
				// This condition only exists because of PAY-4247
				{
					role: { slug: GLOBAL_OWNER_ROLE.slug },
					// We use this to avoid selecting the "shell" user
					password: Not(IsNull()),
				},
			],
			relations: ['role'],
		});
	}

	async setupOwner(payload: OwnerSetupRequestDto) {
		const { email, firstName, lastName, password } = payload;
		if (await this.hasInstanceOwner()) {
			this.logger.debug(
				'Request to claim instance ownership failed because instance owner already exists',
			);
			throw new BadRequestError('Instance owner already setup');
		}

		let shellUser = await this.userRepository.findOneOrFail({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			relations: ['role'],
		});

		shellUser.email = email;
		shellUser.firstName = firstName;
		shellUser.lastName = lastName;
		shellUser.lastActiveAt = new Date();
		shellUser.password = await this.passwordUtility.hash(password);

		shellUser = await this.userRepository.save(shellUser, { transaction: false });

		this.logger.info('Owner was set up successfully');
		this.eventService.emit('instance-owner-setup', { userId: shellUser.id });

		// The next block needs to be deleted and is temporary for now
		// See packages/cli/src/config/schema.ts for more info
		// We update the SettingsRepository so when we "startup" next time
		// the config state is restored.
		// #region Delete me
		await this.settingsRepository.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: JSON.stringify(true) },
		);
		config.set('userManagement.isInstanceOwnerSetUp', true);
		// #endregion

		return shellUser;
	}
}
