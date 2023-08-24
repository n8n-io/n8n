import { Service } from 'typedi';
import type { EntityManager, FindManyOptions, FindOneOptions, FindOptionsWhere } from 'typeorm';
import { In } from 'typeorm';
import { User } from '@db/entities/User';
import type { IUserSettings } from 'n8n-workflow';
import { UserRepository } from '@/databases/repositories';

@Service()
export class UserService {
	constructor(private readonly userRepository: UserRepository) {}

	async findOne(options: FindOneOptions<User>) {
		return this.userRepository.findOne({ relations: ['globalRole'], ...options });
	}

	async findOneOrFail(options: FindOneOptions<User>) {
		return this.userRepository.findOneOrFail({ relations: ['globalRole'], ...options });
	}

	async findMany(options: FindManyOptions<User>) {
		return this.userRepository.find({ relations: ['globalRole'], ...options });
	}

	async findOneBy(options: FindOptionsWhere<User>) {
		return this.userRepository.findOneBy(options);
	}

	create(data: Partial<User>) {
		return this.userRepository.create(data);
	}

	async save(user: Partial<User>) {
		return this.userRepository.save(user);
	}

	async update(userId: string, data: Partial<User>) {
		return this.userRepository.update(userId, data);
	}

	async getByIds(transaction: EntityManager, ids: string[]) {
		return transaction.find(User, { where: { id: In(ids) } });
	}

	getManager() {
		return this.userRepository.manager;
	}

	async updateSettings(userId: string, newSettings: Partial<IUserSettings>) {
		const { settings } = await this.userRepository.findOneOrFail({ where: { id: userId } });

		return this.userRepository.update(userId, { settings: { ...settings, ...newSettings } });
	}

	generatePasswordResetUrl(instanceBaseUrl: string, token: string, mfaEnabled: boolean) {
		const url = new URL(`${instanceBaseUrl}/change-password`);

		url.searchParams.append('token', token);
		url.searchParams.append('mfaEnabled', mfaEnabled.toString());

		return url.toString();
	}
}
