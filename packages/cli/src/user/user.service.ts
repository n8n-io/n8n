import { EntityManager, In } from 'typeorm';
import * as Db from '@/Db';
import { User } from '@db/entities/User';

export class UserService {
	static async get(user: Partial<User>): Promise<User | undefined> {
		return Db.collections.User.findOne(user);
	}

	static async getByIds(transaction: EntityManager, ids: string[]) {
		return transaction.find(User, { id: In(ids) });
	}
}
