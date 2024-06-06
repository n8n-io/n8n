import { Service } from 'typedi';
import { UserService } from '@/services/user.service';
import type { AssignableRole, User } from '@/databases/entities/User';
import { AuthService } from '@/auth/auth.service';
import type { Response } from 'express';
import { UserRepository } from '@/databases/repositories/user.repository';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import type { Settings } from '@oclif/core';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

/**
 * Exposes functionality to be used by the cloud BE hooks.
 * DO NOT DELETE or RENAME any of the methods without making sure this is not used in cloud BE hooks.
 */
@Service()
export class HooksService {
	constructor(
		private userService: UserService,
		private authService: AuthService,
		private userRepository: UserRepository,
		private settingsRepository: SettingsRepository,
	) {}

	/**
	 * Invites users to the instance.
	 * This method is used in the cloud BE hooks, to invite members during sign-up
	 */
	async inviteUsers(owner: User, attributes: Array<{ email: string; role: AssignableRole }>) {
		return await this.userService.inviteUsers(owner, attributes);
	}

	issueCookie(res: Response, user: User) {
		return this.authService.issueCookie(res, user);
	}

	async findInstanceOwner() {
		return await this.userRepository.findOne({ where: { role: 'global:owner' } });
	}

	async findUserById(id: string) {
		return await this.userRepository.findOne({ where: { id } });
	}

	async saveUser(user: User) {
		return await this.userRepository.save(user);
	}

	async updateSettings(key: keyof Settings, value: QueryDeepPartialEntity<Settings>) {
		return await this.settingsRepository.update({ key }, { value: JSON.stringify(value) });
	}
}
