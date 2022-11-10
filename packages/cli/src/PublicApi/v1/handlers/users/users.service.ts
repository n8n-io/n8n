import * as Db from '@/Db';
import { Role } from '@db/entities/Role';
import { User } from '@db/entities/User';

export function isInstanceOwner(user: User): boolean {
	return user.globalRole.name === 'owner';
}

export async function getWorkflowOwnerRole(): Promise<Role> {
	return Db.collections.Role.findOneOrFail({
		name: 'owner',
		scope: 'workflow',
	});
}
