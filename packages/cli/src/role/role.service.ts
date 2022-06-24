import { Db } from '..';
import { Role } from '../databases/entities/Role';

export class RoleService {
	static async get(role: Partial<Role>): Promise<Role | undefined> {
		return Db.collections.Role.findOne(role);
	}
}
