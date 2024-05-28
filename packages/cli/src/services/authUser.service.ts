import { Service } from 'typedi';
import type { AuthUser } from '@db/entities/AuthUser';
import { AuthUserRepository } from '@db/repositories/authUser.repository';

@Service()
export class AuthUserService {
	constructor(private readonly authUserRepository: AuthUserRepository) {}

	async update(userId: string, data: Partial<AuthUser>) {
		const user = await this.authUserRepository.findOneBy({ id: userId });

		if (user) {
			await this.authUserRepository.save({ ...user, ...data }, { transaction: true });
		}

		return;
	}
}
