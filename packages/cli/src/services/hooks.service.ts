import type { Settings, CredentialsEntity, User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { FindManyOptions, FindOneOptions, FindOptionsWhere } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import RudderStack, { type constructorOptions } from '@rudderstack/rudder-sdk-node';
import type { NextFunction, Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import type { AuthUser } from '@/databases/entities/auth-user';
import { AuthUserRepository } from '@/databases/repositories/auth-user.repository';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { Invitation } from '@/interfaces';
import type { AuthenticatedRequest } from '@/requests';
import { UserService } from '@/services/user.service';

/**
 * Exposes functionality to be used by the cloud BE hooks.
 * DO NOT DELETE or RENAME any of the methods without making sure this is not used in cloud BE hooks.
 */
@Service()
export class HooksService {
	constructor(
		private readonly userService: UserService,
		private readonly authService: AuthService,
		private readonly userRepository: UserRepository,
		private readonly settingsRepository: SettingsRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly authUserRepository: AuthUserRepository,
	) {}

	/**
	 * Invite users to instance during signup
	 */
	async inviteUsers(owner: User, attributes: Invitation[]) {
		return await this.userService.inviteUsers(owner, attributes);
	}

	/**
	 * Set the n8n-auth cookie in the response to auto-login
	 * the user after instance is provisioned
	 */
	issueCookie(res: Response, user: AuthUser) {
		return this.authService.issueCookie(res, user);
	}

	/**
	 * Find user in the instance
	 * 1. To know whether the instance owner is already setup
	 * 2. To know when to update the user's profile also in cloud
	 */
	async findOneUser(filter: FindOneOptions<AuthUser>) {
		return await this.authUserRepository.findOne(filter);
	}

	/**
	 * Save instance owner with the cloud signup data
	 */
	async saveUser(user: User) {
		return await this.userRepository.save(user);
	}

	/**
	 * Update instance's settings
	 * 1. To keep the state when users are invited to the instance
	 */
	async updateSettings(filter: FindOptionsWhere<Settings>, set: QueryDeepPartialEntity<Settings>) {
		return await this.settingsRepository.update(filter, set);
	}

	/**
	 * Count the number of workflows
	 * 1. To enforce the active workflow limits in cloud
	 */
	async workflowsCount(filter: FindManyOptions<WorkflowEntity>) {
		return await this.workflowRepository.count(filter);
	}

	/**
	 * Count the number of credentials
	 * 1. To enforce the max credential limits in cloud
	 */
	async credentialsCount(filter: FindManyOptions<CredentialsEntity>) {
		return await this.credentialsRepository.count(filter);
	}

	/**
	 * Count the number of occurrences of a specific key
	 * 1. To know when to stop attempting to invite users
	 */
	async settingsCount(filter: FindManyOptions<Settings>) {
		return await this.settingsRepository.count(filter);
	}

	/**
	 * Add auth middleware to routes injected via the hooks
	 * 1. To authenticate the /proxy routes in the hooks
	 */
	async authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		return await this.authService.authMiddleware(req, res, next);
	}

	getRudderStackClient(key: string, options: constructorOptions): RudderStack {
		return new RudderStack(key, options);
	}

	/**
	 * Return repositories to be used in the hooks
	 * 1. Some self-hosted users rely in the repositories to interact with the DB directly
	 */
	dbCollections() {
		return {
			User: this.userRepository,
			Settings: this.settingsRepository,
			Credentials: this.credentialsRepository,
			Workflow: this.workflowRepository,
		};
	}
}
