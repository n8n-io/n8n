import { EntityManager } from 'typeorm';
import { Role } from '@db/entities/Role';

export class RoleService {
	static async trxGet(transaction: EntityManager, role: Partial<Role>) {
		return transaction.findOne(Role, role);
	}
}
