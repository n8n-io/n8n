import { Db } from '../..';
import type { Role } from '../../databases/entities/Role';

export async function getWorkflowOwnerRole(): Promise<Role | undefined> {
	return Db.collections.Role.findOne({
		name: 'owner',
		scope: 'workflow',
	});
}
