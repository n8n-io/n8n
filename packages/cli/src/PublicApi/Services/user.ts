import { User } from '../../databases/entities/User';

export function isInstanceOwner(user: User): boolean {
	return user.globalRole.name === 'owner';
}
