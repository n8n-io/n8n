import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/User';

@Service()
export class UserRepository extends Repository<User> {
	constructor(dataSource: DataSource) {
		super(User, dataSource.manager);
	}
}
