import { Service } from 'typedi';
import { hash } from 'bcryptjs';
import { UserRepository as ProductionUserRepository } from '@/databases/repositories/user.repository';
import { INSTANCE_ONWER_EMAIL, INSTANCE_ONWER_PASSWORD } from '../constants';

/**
 * User repository for use in benchmarking suites only.
 */
@Service()
export class UserRepository extends ProductionUserRepository {
	async createInstanceOwner() {
		const user = this.create({
			email: INSTANCE_ONWER_EMAIL,
			password: await hash(INSTANCE_ONWER_PASSWORD, 10),
			firstName: 'John',
			lastName: 'Smith',
			role: 'global:owner',
			apiKey:
				'n8n_api_96a4804143bdeb044802273c93423c33e1582c89a764c645fd6304fd2df19f3b2c73f4b972e28194',
		});

		user.computeIsOwner();

		return await this.save(user);
	}
}
