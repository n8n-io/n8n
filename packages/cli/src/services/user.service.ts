import { Service } from 'typedi';
import type { EntityManager, FindManyOptions, FindOneOptions, FindOptionsWhere } from 'typeorm';
import { In } from 'typeorm';
import { User } from '@db/entities/User';
import type { IUserSettings } from 'n8n-workflow';
import { UserRepository } from '@/databases/repositories';
import { getInstanceBaseUrl } from '@/UserManagement/UserManagementHelper';
import type { PublicUser } from '@/Interfaces';

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
		return this.userRepository.find(options);
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

	generatePasswordResetUrl(instanceBaseUrl: string, token: string) {
		const url = new URL(`${instanceBaseUrl}/change-password`);

		url.searchParams.append('token', token);

		return url.toString();
	}

	toPublic(user: User, { withInviteUrl } = { withInviteUrl: false }) {
		const { password, updatedAt, apiKey, authIdentities, personalizationAnswers, ...rest } = user;

		const ldapIdentity = authIdentities?.find((i) => i.providerType === 'ldap');

		const publicUser: PublicUser = { ...rest, signInType: ldapIdentity ? 'ldap' : 'email' };

		return withInviteUrl ? this.addInviteUrl(publicUser, user.id) : publicUser;
	}

	private addInviteUrl(user: PublicUser, inviterId: string) {
		if (!user.isPending) return user;

		const url = new URL(getInstanceBaseUrl());
		url.pathname = '/signup';
		url.searchParams.set('inviterId', inviterId);
		url.searchParams.set('inviteeId', user.id);

		user.inviteAcceptUrl = url.toString();

		return user;
	}
}
