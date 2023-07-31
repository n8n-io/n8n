import { Service } from 'typedi';
import type { EntityManager, FindOptionsWhere } from 'typeorm';
import { Role } from '@db/entities/Role';
import { SharedWorkflowRepository } from '@db/repositories';

@Service()
export class OldRoleService {
	constructor(private sharedWorkflowRepository: SharedWorkflowRepository) {}

	// @TODO: Add to new RoleService
	static async trxGet(transaction: EntityManager, role: FindOptionsWhere<Role>) {
		return transaction.findOneBy(Role, role);
	}
}
