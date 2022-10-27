/* eslint-disable @typescript-eslint/naming-convention */
import type { RoleRepository } from './RoleRepository';
import type { UserRepository } from './UserRepository';

export interface IRepositories {
	Role: RoleRepository;
	User: UserRepository;
}
