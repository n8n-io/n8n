import { EntityManager, FindOptionsWhere, In } from 'typeorm';
import * as Db from '@/Db';
import { User } from '@db/entities/User';

export class UserService {
	static async get(where: FindOptionsWhere<User>): Promise<User | null> {
		return Db.collections.User.findOne({
			relations: ['globalRole'],
			where,
		});
	}

	static async getByIds(transaction: EntityManager, ids: string[]) {
		return transaction.find(User, { where: { id: In(ids) } });
	}
}
