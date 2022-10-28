/* eslint-disable @typescript-eslint/naming-convention */
import type { RoleRepository } from './RoleRepository';
import type { SettingsRepository } from './SettingsRepository';
import type { UserRepository } from './UserRepository';

export interface IRepositories {
	Role: RoleRepository;
	Settings: SettingsRepository;
	User: UserRepository;
}
