import { Container, Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import type { FindManyOptions, SelectQueryBuilder } from '@n8n/typeorm';
import { DataSource, In, Like, Repository } from '@n8n/typeorm';

import { CredentialsEntity } from '../entities';
import type { User } from '../entities';
import { SharedCredentialsRepository } from './shared-credentials.repository';
import type { ListQuery } from '../entities/types-db';

@Service()
export class CredentialsRepository extends Repository<CredentialsEntity> {
	constructor(dataSource: DataSource) {
		super(CredentialsEntity, dataSource.manager);
	}

	async findStartingWith(credentialName: string) {
		return await this.find({
			select: ['name'],
			where: { name: Like(`${credentialName}%`) },
		});
	}

	async findMany(
		listQueryOptions?: ListQuery.Options & {
			includeData?: boolean;
			user?: User;
			/** When provided, sets sort order for the query. */
			order?: FindManyOptions<CredentialsEntity>['order'];
		},
		credentialIds?: string[],
	) {
		const findManyOptions = this.toFindManyOptions(listQueryOptions);

		if (credentialIds) {
			findManyOptions.where = { ...findManyOptions.where, id: In(credentialIds) };
		}

		return await this.find(findManyOptions);
	}

	async findManyAndCount(
		listQueryOptions?: ListQuery.Options & {
			includeData?: boolean;
			user?: User;
			/** When provided, sets sort order for the query. */
			order?: FindManyOptions<CredentialsEntity>['order'];
		},
		credentialIds?: string[],
	): Promise<[CredentialsEntity[], number]> {
		const findManyOptions = this.toFindManyOptions(listQueryOptions);

		if (credentialIds) {
			findManyOptions.where = { ...findManyOptions.where, id: In(credentialIds) };
		}

		return await this.findAndCount(findManyOptions);
	}

	private toFindManyOptions(
		listQueryOptions?: ListQuery.Options & {
			includeData?: boolean;
			order?: FindManyOptions<CredentialsEntity>['order'];
		},
	) {
		const findManyOptions: FindManyOptions<CredentialsEntity> = {};

		type Select = Array<keyof CredentialsEntity>;

		const defaultRelations = ['shared', 'shared.project', 'shared.project.projectRelations'];
		const defaultSelect: Select = [
			'id',
			'name',
			'type',
			'isManaged',
			'createdAt',
			'updatedAt',
			'isGlobal',
			'isResolvable',
			'resolverId',
			'resolvableAllowFallback',
		];

		if (!listQueryOptions) {
			return {
				select: defaultSelect,
				relations: defaultRelations,
			} as FindManyOptions<CredentialsEntity>;
		}

		const { filter, select, take, skip, order } = listQueryOptions;

		if (typeof filter?.name === 'string' && filter?.name !== '') {
			filter.name = Like(`%${filter.name}%`);
		}

		if (typeof filter?.type === 'string' && filter?.type !== '') {
			filter.type = Like(`%${filter.type}%`);
		}

		this.handleSharedFilters(listQueryOptions);

		if (filter) findManyOptions.where = filter;
		if (select) findManyOptions.select = select;
		if (take) findManyOptions.take = take;
		if (skip) findManyOptions.skip = skip;

		if (take && select && !select?.id) {
			findManyOptions.select = { ...findManyOptions.select, id: true }; // pagination requires id
		}

		if (!findManyOptions.select) {
			findManyOptions.select = defaultSelect;
			findManyOptions.relations = defaultRelations;
		}

		if (order !== undefined) {
			findManyOptions.order = order;
		}

		if (listQueryOptions.includeData) {
			if (Array.isArray(findManyOptions.select)) {
				findManyOptions.select.push('data');
			} else {
				findManyOptions.select.data = true;
			}
		}

		return findManyOptions;
	}

	private handleSharedFilters(
		listQueryOptions?: ListQuery.Options & { includeData?: boolean },
	): void {
		if (!listQueryOptions?.filter) return;

		const { filter } = listQueryOptions;

		if (typeof filter.projectId === 'string' && filter.projectId !== '') {
			filter.shared = {
				projectId: filter.projectId,
			};
			delete filter.projectId;
		}

		if (typeof filter.withRole === 'string' && filter.withRole !== '') {
			filter.shared = {
				...(filter?.shared ? filter.shared : {}),
				role: filter.withRole,
			};
			delete filter.withRole;
		}

		if (
			filter.user &&
			typeof filter.user === 'object' &&
			'id' in filter.user &&
			typeof filter.user.id === 'string'
		) {
			filter.shared = {
				...(filter?.shared ? filter.shared : {}),
				project: {
					projectRelations: {
						userId: filter.user.id,
					},
				},
			};
			delete filter.user;
		}
	}

	async getManyByIds(ids: string[], { withSharings } = { withSharings: false }) {
		const findManyOptions: FindManyOptions<CredentialsEntity> = { where: { id: In(ids) } };

		if (withSharings) {
			findManyOptions.relations = {
				shared: {
					project: true,
				},
			};
		}

		return await this.find(findManyOptions);
	}

	/**
	 * Find all global credentials
	 */
	async findAllGlobalCredentials(includeData = false): Promise<CredentialsEntity[]> {
		const findManyOptions = this.toFindManyOptions({ includeData });

		findManyOptions.where = { ...findManyOptions.where, isGlobal: true };

		return await this.find(findManyOptions);
	}

	/**
	 * Find all credentials that are owned by a personal project.
	 */
	async findAllPersonalCredentials(): Promise<CredentialsEntity[]> {
		return await this.findBy({ shared: { project: { type: 'personal' } } });
	}

	/**
	 * Find all credentials that are part of any project that the workflow is
	 * part of.
	 *
	 * This is useful to for finding credentials that can be used in the
	 * workflow.
	 */
	async findAllCredentialsForWorkflow(workflowId: string): Promise<CredentialsEntity[]> {
		return await this.findBy({
			shared: { project: { sharedWorkflows: { workflowId } } },
		});
	}

	/**
	 * Find all credentials that are part of that project.
	 *
	 * This is useful for finding credentials that can be used in workflows that
	 * are part of this project.
	 */
	async findAllCredentialsForProject(projectId: string): Promise<CredentialsEntity[]> {
		return await this.findBy({ shared: { projectId } });
	}

	/**
	 * Get credentials with sharing permissions using a subquery instead of pre-fetched IDs.
	 * This combines the credential and sharing queries into a single database query.
	 */
	async getManyAndCountWithSharingSubquery(
		user: User,
		sharingOptions: {
			scopes?: Scope[];
			projectRoles?: string[];
			credentialRoles?: string[];
			isPersonalProject?: boolean;
			personalProjectOwnerId?: string;
			onlySharedWithMe?: boolean;
		},
		options: ListQuery.Options & {
			includeData?: boolean;
			order?: FindManyOptions<CredentialsEntity>['order'];
		} = {},
	) {
		const query = this.getManyQueryWithSharingSubquery(user, sharingOptions, options);

		// Get credentials with pagination
		const credentials = await query.getMany();

		// Build count query without pagination and relations
		const countQuery = this.getManyQueryWithSharingSubquery(user, sharingOptions, {
			...options,
			take: undefined,
			skip: undefined,
			select: undefined,
		});

		// Remove relations and select for count
		const count = await countQuery.select('credential.id').getCount();

		return { credentials, count };
	}

	/**
	 * Build a query that filters credentials based on sharing permissions using a subquery.
	 */
	private getManyQueryWithSharingSubquery(
		user: User,
		sharingOptions: {
			scopes?: Scope[];
			projectRoles?: string[];
			credentialRoles?: string[];
			isPersonalProject?: boolean;
			personalProjectOwnerId?: string;
			onlySharedWithMe?: boolean;
		},
		options: ListQuery.Options & {
			includeData?: boolean;
			order?: FindManyOptions<CredentialsEntity>['order'];
		} = {},
	): SelectQueryBuilder<CredentialsEntity> {
		const qb = this.createQueryBuilder('credential');

		// Pass projectId from options to sharing options
		const projectId =
			typeof options.filter?.projectId === 'string' ? options.filter.projectId : undefined;
		const sharingOptionsWithProjectId = {
			...sharingOptions,
			projectId,
		};

		// Build the subquery for shared credential IDs
		const sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
		const sharedCredentialSubquery = sharedCredentialsRepository.buildSharedCredentialIdsSubquery(
			user,
			sharingOptionsWithProjectId,
		);

		// Apply the sharing filter using the subquery
		qb.andWhere(`credential.id IN (${sharedCredentialSubquery.getQuery()})`);
		qb.setParameters(sharedCredentialSubquery.getParameters());

		// Apply other filters
		// projectId is always handled in the subquery, so skip it to avoid issues
		const filtersToApply =
			options.filter && typeof options.filter.projectId !== 'undefined'
				? { ...options.filter, projectId: undefined }
				: options.filter;

		// Apply name filter
		if (typeof filtersToApply?.name === 'string' && filtersToApply.name !== '') {
			qb.andWhere('credential.name LIKE :name', { name: `%${filtersToApply.name}%` });
		}

		// Apply type filter
		if (typeof filtersToApply?.type === 'string' && filtersToApply.type !== '') {
			qb.andWhere('credential.type LIKE :type', { type: `%${filtersToApply.type}%` });
		}

		// Apply select
		const defaultSelect: Array<keyof CredentialsEntity> = [
			'id',
			'name',
			'type',
			'isManaged',
			'createdAt',
			'updatedAt',
			'isGlobal',
			'isResolvable',
			'resolverId',
			'resolvableAllowFallback',
		];

		if (options.select) {
			// User provided custom select
			const selectFields = options.select;
			// Ensure id is included for pagination
			if (options.take && !selectFields.id) {
				qb.select([...Object.keys(selectFields).map((k) => `credential.${k}`), 'credential.id']);
			} else {
				qb.select(Object.keys(selectFields).map((k) => `credential.${k}`));
			}
		} else {
			// Use default select
			qb.select(defaultSelect.map((k) => `credential.${k}`));
		}

		// Add data field if requested
		if (options.includeData) {
			qb.addSelect('credential.data');
		}

		// Apply relations
		if (!options.select) {
			// Only add relations if using default select
			qb.leftJoinAndSelect('credential.shared', 'shared')
				.leftJoinAndSelect('shared.project', 'project')
				.leftJoinAndSelect('project.projectRelations', 'projectRelations');
		}

		// Apply sorting
		if (options.order) {
			Object.entries(options.order).forEach(([key, direction]) => {
				qb.addOrderBy(`credential.${key}`, direction as 'ASC' | 'DESC');
			});
		}

		// Apply pagination
		if (options.take) {
			qb.take(options.take);
		}
		if (options.skip) {
			qb.skip(options.skip);
		}

		return qb;
	}
}
