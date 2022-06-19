import { Db } from '../../../..';
import { Role } from '../../../../databases/entities/Role';
import { User } from '../../../../databases/entities/User';

export function isInstanceOwner(user: User): boolean {
	return user.globalRole.name === 'owner';
}

export async function getWorkflowOwnerRole(): Promise<Role> {
	return Db.collections.Role.findOneOrFail({
		name: 'owner',
		scope: 'workflow',
	});
}
