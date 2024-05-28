import { Service } from 'typedi';
import { IsNull, Not, Repository } from '@n8n/typeorm';
import type { AuthUser } from '../entities/AuthUser';

@Service()
export class AuthUserRepository extends Repository<AuthUser> {
	async findByEmail(email: string) {
		return await this.findOne({
			where: {
				email,
				password: Not(IsNull()),
			},
			relations: ['authIdentities'],
		});
	}
}
