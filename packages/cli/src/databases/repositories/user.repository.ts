import { Service } from 'typedi';
import type { EntityManager, FindManyOptions } from '@n8n/typeorm';
import { DataSource, In, IsNull, Not, Repository } from '@n8n/typeorm';
import type { ListQuery } from '@/requests';

import { type GlobalRole, User } from '../entities/User';
@Service()
export class UserRepository extends Repository<User> {
	constructor(dataSource: DataSource) {
		super(User, dataSource.manager);
	}

	async findManyByIds(userIds: string[]) {
		return await this.find({
			where: { id: In(userIds) },
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
			relations: ['authIdentities'],
		});
	}

	/** Counts the number of users in each role, e.g. `{ admin: 2, member: 6, owner: 1 }` */
	async countUsersByRole() {
		const rows = (await this.createQueryBuilder()
			.select(['role', 'COUNT(role) as count'])
			.groupBy('role')
			.execute()) as Array<{ role: GlobalRole; count: string }>;
		return rows.reduce(
			(acc, row) => {
				acc[row.role] = parseInt(row.count, 10);
				return acc;
			},
			{} as Record<GlobalRole, number>,
		);
	}

	async toFindManyOptions(listQueryOptions?: ListQuery.Options) {
		const findManyOptions: FindManyOptions<User> = {};

		if (!listQueryOptions) {
			findManyOptions.relations = ['authIdentities'];
			return findManyOptions;
		}

		const { filter, select, take, skip } = listQueryOptions;

		if (select) findManyOptions.select = select;
		if (take) findManyOptions.take = take;
		if (skip) findManyOptions.skip = skip;

		if (take && !select) {
			findManyOptions.relations = ['authIdentities'];
		}

		if (take && select && !select?.id) {
			findManyOptions.select = { ...findManyOptions.select, id: true }; // pagination requires id
		}

		if (filter) {
			const { isOwner, ...otherFilters } = filter;

			findManyOptions.where = otherFilters;

			if (isOwner !== undefined) {
				findManyOptions.where.role = isOwner ? 'global:owner' : Not('global:owner');
			}
		}

		return findManyOptions;
	}

	/**
	 * Get emails of users who have completed setup, by user IDs.
	 */
	async getEmailsByIds(userIds: string[]) {
		return await this.find({
			select: ['email'],
			where: { id: In(userIds), password: Not(IsNull()) },
		});
	}
}
