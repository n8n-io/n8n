import type { EntityManager, FindOptionsWhere } from 'typeorm';
import * as Db from '@/Db';
import { Role } from '@db/entities/Role';

export class RoleService {
	static async get(role: FindOptionsWhere<Role>): Promise<Role | null> {
		return Db.collections.Role.findOneBy(role);
	}

	static async trxGet(transaction: EntityManager, role: FindOptionsWhere<Role>) {
		return transaction.findOneBy(Role, role);
	}

	static async getUserRoleForWorkflow(userId: string, workflowId: string) {
		const shared = await Db.collections.SharedWorkflow.findOne({
			where: { workflowId, userId },
			relations: ['role'],
		});
		return shared?.role;
	}
}
