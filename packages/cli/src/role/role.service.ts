/* eslint-disable import/no-cycle */
import { EntityManager } from 'typeorm';
import { Db } from '..';
import { Role } from '../databases/entities/Role';

export class RoleService {
	static async get(role: Partial<Role>): Promise<Role | undefined> {
		return Db.collections.Role.findOne(role);
	}

	static async trxGet(transaction: EntityManager, role: Partial<Role>) {
		return transaction.findOne(Role, role);
	}
}
