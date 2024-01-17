import { Service } from 'typedi';
import type { EntityManager, FindManyOptions } from 'typeorm';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { User } from '../entities/User';
import type { ListQuery } from '@/requests';

@Service()
export class UserRepository extends Repository<User> {
	constructor(dataSource: DataSource) {
		super(User, dataSource.manager);
	}

	async findManybyIds(userIds: string[]) {
		return await this.find({
			where: { id: In(userIds) },
			relations: ['globalRole'],
		});
	}

	async deleteAllExcept(user: User) {
		await this.delete({ id: Not(user.id) });
	}

	async getByIds(transaction: EntityManager, ids: string[]) {
		return await transaction.find(User, { where: { id: In(ids) } });
	}

	async findManyByEmail(emails: string[]) {
		return await this.find({
			where: { email: In(emails) },
			relations: ['globalRole'],
			select: ['email', 'password', 'id'],
		});
	}

	async deleteMany(userIds: string[]) {
		return await this.delete({ id: In(userIds) });
	}

	async findNonShellUser(email: string) {
		return await this.findOne({
			where: {
				email,
				password: Not(IsNull()),
			},
			relations: ['authIdentities', 'globalRole'],
		});
	}

	async toFindManyOptions(listQueryOptions?: ListQuery.Options, globalOwnerRoleId?: string) {
		const findManyOptions: FindManyOptions<User> = {};

		if (!listQueryOptions) {
			findManyOptions.relations = ['globalRole', 'authIdentities'];
			return findManyOptions;
		}

		const { filter, select, take, skip } = listQueryOptions;

		if (select) findManyOptions.select = select;
		if (take) findManyOptions.take = take;
		if (skip) findManyOptions.skip = skip;

		if (take && !select) {
			findManyOptions.relations = ['globalRole', 'authIdentities'];
		}

		if (take && select && !select?.id) {
			findManyOptions.select = { ...findManyOptions.select, id: true }; // pagination requires id
		}

		if (filter) {
			const { isOwner, ...otherFilters } = filter;

			findManyOptions.where = otherFilters;

			if (isOwner !== undefined && globalOwnerRoleId) {
				findManyOptions.relations = ['globalRole'];
				findManyOptions.where.globalRole = {
					id: isOwner ? globalOwnerRoleId : Not(globalOwnerRoleId),
				};
			}
		}

		return findManyOptions;
	}
}
