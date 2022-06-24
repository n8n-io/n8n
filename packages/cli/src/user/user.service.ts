import { Db } from '..';
import { User } from '../databases/entities/User';

export class UserService {
	static async get(user: Partial<User>): Promise<User | undefined> {
		return Db.collections.User.findOne(user);
	}
}
