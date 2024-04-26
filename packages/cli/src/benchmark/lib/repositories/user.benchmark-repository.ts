import { Service } from 'typedi';
import { hash } from 'bcryptjs';
import { UserRepository as ProductionUserRepository } from '@/databases/repositories/user.repository';
import { INSTANCE_ONWER } from '../constants';

@Service()
export class UserRepository extends ProductionUserRepository {
	async createInstanceOwner() {
		const user = this.create({
			email: INSTANCE_ONWER.EMAIL,
			password: await hash(INSTANCE_ONWER.PASSWORD, 10),
			firstName: INSTANCE_ONWER.FIRST_NAME,
			lastName: INSTANCE_ONWER.LAST_NAME,
			role: 'global:owner',
			apiKey: INSTANCE_ONWER.API_KEY,
		});

		user.computeIsOwner();

		return await this.save(user);
	}
}
