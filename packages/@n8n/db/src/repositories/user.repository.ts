import type { UsersListFilterDto } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import type { DeepPartial, EntityManager, SelectQueryBuilder } from '@n8n/typeorm';
import { Brackets, DataSource, In, IsNull, Not, Repository } from '@n8n/typeorm';

import { ApiKey, Project, ProjectRelation, User } from '../entities';

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

	async findByApiKey(apiKey: string) {
		const keyOwner = await this.createQueryBuilder('user')
			.innerJoin(ApiKey, 'apiKey', 'apiKey.userId = user.id')
			.leftJoinAndSelect('user.role', 'role')
			.leftJoinAndSelect('role.scopes', 'scopes')
			.where('apiKey.apiKey = :apiKey', { apiKey })
			.select(['user', 'role', 'scopes'])
			.getOne();

		return keyOwner;
	}

	/**
	 * @deprecated Use `UserRepository.save` instead if you can.
	 *
	 * We need to use `save` so that that the subscriber in
	 * packages/@n8n/db/src/entities/Project.ts receives the full user.
	 * With `update` it would only receive the updated fields, e.g. the `id`
	 * would be missing. test('does not use `Repository.update`, but
	 * `Repository.save` instead'.
	 */
	async update(...args: Parameters<Repository<User>['update']>) {
		return await super.update(...args);
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
			relations: ['authIdentities', 'role'],
		});
	}

	/** Counts the number of users in each role, e.g. `{ admin: 2, member: 6, owner: 1 }` */
	async countUsersByRole() {
		const escapedRoleSlug = this.manager.connection.driver.escape('roleSlug');
		const rows = (await this.createQueryBuilder()
			.select([escapedRoleSlug, `COUNT(${escapedRoleSlug}) as count`])
			.groupBy(escapedRoleSlug)
			.execute()) as Array<{ roleSlug: string; count: string }>;
		return rows.reduce(
			(acc, row) => {
				acc[row.roleSlug] = parseInt(row.count, 10);
				return acc;
			},
			{} as Record<string, number>,
		);
	}

	/**
	 * Get emails of users who have completed setup, by user IDs.
	 */
	async getEmailsByIds(userIds: string[]) {
		return await this.find({
			select: ['id', 'email'],
			where: { id: In(userIds), password: Not(IsNull()) },
		});
	}

	async createUserWithProject(
		user: DeepPartial<User>,
		transactionManager?: EntityManager,
	): Promise<{ user: User; project: Project }> {
		const createInner = async (entityManager: EntityManager) => {
			const newUser = entityManager.create(User, user);
			const savedUser = await entityManager.save<User>(newUser);
			const userWithRole = await entityManager.findOne(User, {
				where: { id: savedUser.id },
				relations: ['role'],
			});
			if (!userWithRole) throw new Error('Failed to create user!');
			const savedProject = await entityManager.save<Project>(
				entityManager.create(Project, {
					type: 'personal',
					name: userWithRole.createPersonalProjectName(),
				}),
			);
			await entityManager.save<ProjectRelation>(
				entityManager.create(ProjectRelation, {
					projectId: savedProject.id,
					userId: savedUser.id,
					role: { slug: PROJECT_OWNER_ROLE_SLUG },
				}),
			);
			return { user: userWithRole, project: savedProject };
		};
		if (transactionManager) {
			return await createInner(transactionManager);
		}
		// TODO: use a transactions
		// This is blocked by TypeORM having concurrency issues with transactions
		return await createInner(this.manager);
	}

	/**
	 * Find the user that owns the personal project that owns the workflow.
	 *
	 * Returns null if the workflow does not exist or is owned by a team project.
	 */
	async findPersonalOwnerForWorkflow(workflowId: string): Promise<User | null> {
		return await this.findOne({
			where: {
				projectRelations: {
					role: { slug: PROJECT_OWNER_ROLE_SLUG },
					project: { sharedWorkflows: { workflowId, role: 'workflow:owner' } },
				},
			},
			relations: ['role'],
		});
	}

	/**
	 * Find the user that owns the personal project.
	 *
	 * Returns null if the project does not exist or is not a personal project.
	 */
	async findPersonalOwnerForProject(projectId: string): Promise<User | null> {
		return await this.findOne({
			where: {
				projectRelations: {
					role: { slug: PROJECT_OWNER_ROLE_SLUG },
					projectId,
				},
			},
			relations: ['role'],
		});
	}

	private applyUserListSelect(
		queryBuilder: SelectQueryBuilder<User>,
		select: Array<keyof User> | undefined,
	): SelectQueryBuilder<User> {
		if (select !== undefined) {
			if (!select.includes('id')) {
				select.unshift('id'); // Ensure id is always selected
			}
			queryBuilder.select(select.map((field) => `user.${field}`));
		}
		return queryBuilder;
	}

	private applyUserListFilter(
		queryBuilder: SelectQueryBuilder<User>,
		filter: UsersListFilterDto['filter'],
	): SelectQueryBuilder<User> {
		if (filter?.email !== undefined) {
			queryBuilder.andWhere('user.email = :email', {
				email: filter.email,
			});
		}

		if (filter?.firstName !== undefined) {
			queryBuilder.andWhere('user.firstName = :firstName', {
				firstName: filter.firstName,
			});
		}

		if (filter?.lastName !== undefined) {
			queryBuilder.andWhere('user.lastName = :lastName', {
				lastName: filter.lastName,
			});
		}

		if (filter?.mfaEnabled !== undefined) {
			queryBuilder.andWhere('user.mfaEnabled = :mfaEnabled', {
				mfaEnabled: filter.mfaEnabled,
			});
		}

		if (filter?.isOwner !== undefined) {
			if (filter.isOwner) {
				queryBuilder.andWhere('user.role = :role', {
					role: 'global:owner',
				});
			} else {
				queryBuilder.andWhere('user.role <> :role', {
					role: 'global:owner',
				});
			}
		}

		if (filter?.fullText !== undefined) {
			const fullTextFilter = `%${filter.fullText}%`;
			queryBuilder.andWhere(
				new Brackets((qb) => {
					qb.where('LOWER(user.firstName) like LOWER(:firstNameFullText)', {
						firstNameFullText: fullTextFilter,
					})
						.orWhere('LOWER(user.lastName) like LOWER(:lastNameFullText)', {
							lastNameFullText: fullTextFilter,
						})
						.orWhere('LOWER(user.email) like LOWER(:email)', {
							email: fullTextFilter,
						});
				}),
			);
		}

		return queryBuilder;
	}

	private applyUserListExpand(
		queryBuilder: SelectQueryBuilder<User>,
		expand: UsersListFilterDto['expand'],
	): SelectQueryBuilder<User> {
		if (expand?.includes('projectRelations')) {
			queryBuilder
				.leftJoinAndSelect(
					'user.projectRelations',
					'projectRelations',
					'projectRelations.role <> :projectRole',
					{ projectRole: PROJECT_OWNER_ROLE_SLUG },
				)
				.leftJoinAndSelect('projectRelations.project', 'project')
				.leftJoinAndSelect('projectRelations.role', 'projectRole');
		}

		return queryBuilder;
	}

	private applyUserListSort(
		queryBuilder: SelectQueryBuilder<User>,
		sortBy: UsersListFilterDto['sortBy'],
	): SelectQueryBuilder<User> {
		if (sortBy) {
			for (const sort of sortBy) {
				const [field, order] = sort.split(':');
				if (field === 'role') {
					queryBuilder.addSelect(
						"CASE WHEN user.role='global:owner' THEN 0 WHEN user.role='global:admin' THEN 1 ELSE 2 END",
						'userroleorder',
					);
					queryBuilder.addOrderBy('userroleorder', order.toUpperCase() as 'ASC' | 'DESC');
				} else {
					queryBuilder.addOrderBy(`user.${field}`, order.toUpperCase() as 'ASC' | 'DESC');
				}
			}
		}

		return queryBuilder;
	}

	private applyUserListPagination(
		queryBuilder: SelectQueryBuilder<User>,
		take: number,
		skip: number | undefined,
	): SelectQueryBuilder<User> {
		if (take >= 0) queryBuilder.take(take);
		if (skip) queryBuilder.skip(skip);

		return queryBuilder;
	}

	buildUserQuery(listQueryOptions?: UsersListFilterDto): SelectQueryBuilder<User> {
		const queryBuilder = this.createQueryBuilder('user');

		queryBuilder.leftJoinAndSelect('user.authIdentities', 'authIdentities');

		if (listQueryOptions === undefined) {
			return queryBuilder;
		}
		const { filter, select, take, skip, expand, sortBy } = listQueryOptions;

		this.applyUserListSelect(queryBuilder, select as Array<keyof User>);
		this.applyUserListFilter(queryBuilder, filter);
		this.applyUserListExpand(queryBuilder, expand);
		this.applyUserListPagination(queryBuilder, take, skip);
		this.applyUserListSort(queryBuilder, sortBy);
		queryBuilder.leftJoinAndSelect('user.role', 'role');
		queryBuilder.leftJoinAndSelect('role.scopes', 'scopes');

		return queryBuilder;
	}
}
