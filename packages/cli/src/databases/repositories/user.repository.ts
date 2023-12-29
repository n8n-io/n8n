import { Service } from 'typedi';
import { DataSource, In, Not, Repository } from 'typeorm';
import { User } from '../entities/User';

@Service()
export class UserRepository extends Repository<User> {
	constructor(dataSource: DataSource) {
		super(User, dataSource.manager);
	}

	async findManybyIds(userIds: string[]) {
		return this.find({
			where: { id: In(userIds) },
			relations: ['globalRole'],
		});
	}

	async deleteAllExcept(user: User) {
		await this.delete({ id: Not(user.id) });
	}
}
