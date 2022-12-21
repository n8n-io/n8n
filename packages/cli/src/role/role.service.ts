import { EntityManager } from 'typeorm';
import * as Db from '@/Db';
import { Role } from '@db/entities/Role';

export class RoleService {
	static async get(role: Partial<Role>): Promise<Role | undefined> {
		return Db.collections.Role.findOne(role);
	}

	static async trxGet(transaction: EntityManager, role: Partial<Role>) {
		return transaction.findOne(Role, role);
	}

	static async getUserRoleForWorkflow(userId: string, workflowId: string) {
		const shared = await Db.collections.SharedWorkflow.findOne({
			where: {
				workflow: { id: workflowId },
				user: { id: userId },
			},
			relations: ['role'],
		});
		return shared?.role;
	}
}
