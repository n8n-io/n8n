/* eslint-disable @typescript-eslint/naming-convention */
import type { CredentialsRepository } from './CredentialsRepository';
import type { RoleRepository } from './RoleRepository';
import type { SettingsRepository } from './SettingsRepository';
import type { UserRepository } from './UserRepository';

export interface IRepositories {
	Credentials: CredentialsRepository;
	Role: RoleRepository;
	Settings: SettingsRepository;
	User: UserRepository;
}
