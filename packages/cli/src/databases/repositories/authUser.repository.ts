import { Service } from 'typedi';
import { DataSource, In, IsNull, Not, Repository } from '@n8n/typeorm';
import { AuthUser } from '../entities/AuthUser';

@Service()
export class AuthUserRepository extends Repository<AuthUser> {
	constructor(dataSource: DataSource) {
		super(AuthUser, dataSource.manager);
	}

	async findManyByIds(userIds: string[]) {
		return await this.find({
			where: { id: In(userIds) },
		});
	}

	async findManyByEmail(emails: string[]) {
		return await this.find({
			where: { email: In(emails) },
			select: ['email', 'password', 'id'],
		});
	}

	/** Get emails of users who have completed setup, by user IDs */
	async getEmailsByIds(userIds: string[]) {
		return await this.find({
			select: ['email'],
			where: { id: In(userIds), password: Not(IsNull()) },
		});
	}

	async findNonShellUser(email: string) {
		return await this.findOne({
			where: {
				email,
				password: Not(IsNull()),
			},
			relations: ['authIdentities'],
		});
	}
}
