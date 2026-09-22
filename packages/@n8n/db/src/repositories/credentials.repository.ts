import { assertClearedFor, credentialContentSubject } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import type { FindManyOptions, FindOptionsWhere, SelectQueryBuilder } from '@n8n/typeorm';
import { DataSource, In, IsNull, LessThan, Like, Not, QueryFailedError } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import { UserError } from 'n8n-workflow';

import {
	CredentialsEntity,
	EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
	SharedCredentials,
	type User,
} from '../entities';
import { BaseRepository } from './base-repository';
import {
	CredentialDependencyRepository,
	addCredentialDependencyExistsFilter,
	type CredentialDependencyFilter,
} from './credential-dependency.repository';
import { InstanceCredentialAssignmentRepository } from './instance-credential-assignment.repository';
import { SharedCredentialsRepository } from './shared-credentials.repository';
import type { ICredentialsDb, ListQuery } from '../entities/types-db';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';
import { isUniqueConstraintError } from '../utils/is-unique-constraint-error';
import { chunkIds } from '../utils/chunk-ids';
import { parseListQuerySortBy } from '../utils/list-query-sort';

export class CredentialIdConflictError extends UserError {
	constructor() {
		super('A credential with this ID already exists');
	}
}

const SORTABLE_COLUMNS = new Set(['id', 'name', 'createdAt', 'updatedAt']);

export type CredentialSharingRelation =
	| 'shared'
	| 'shared.project'
	| 'shared.project.projectRelations';

// The list path reads `shared[].role` and `shared[].project`; loading every member of
// every shared project would multiply the joined rows by the project sizes.
const DEFAULT_CREDENTIAL_RELATIONS: CredentialSharingRelation[] = ['shared', 'shared.project'];

type CredentialsListQueryOptions = ListQuery.Options & {
	includeData?: boolean;
	/** Also match global credentials, so they page, count and filter like every other row. */
	includeGlobal?: boolean;
	user?: User;
	relations?: CredentialSharingRelation[];
};

@Service()
export class CredentialsRepository extends BaseRepository<CredentialsEntity> {
	constructor(
		dataSource: DataSource,
		private readonly instanceCredentialAssignmentRepository: InstanceCredentialAssignmentRepository,
		transactionRunner: TransactionRunner,
		private readonly credentialDependencyRepository: CredentialDependencyRepository,
	) {
		super(CredentialsEntity, dataSource.manager, transactionRunner);
	}

	async insertProjectCredentialWithOwner(
		credential: Pick<
			CredentialsEntity,
			'id' | 'name' | 'type' | 'data' | 'isManaged' | 'isResolvable'
		> &
			Partial<Pick<CredentialsEntity, 'isGlobal'>>,
		projectId: string,
		externalSecretProviderIds: string[],
		ctx: OperationContext,
	): Promise<CredentialsEntity> {
		assertClearedFor(ctx.policyCleared, 'credentialSave', credentialContentSubject(credential));
		return await this.runInTransaction(ctx, async (manager) => {
			const entity = this.create({ ...credential, usageScope: 'project' });
			try {
				await manager.insert(CredentialsEntity, entity);
			} catch (error) {
				// Only the credential insert can report an ID conflict.
				if (isUniqueConstraintError(error)) throw new CredentialIdConflictError();
				throw error;
			}
			await manager.insert(SharedCredentials, {
				credentialsId: entity.id,
				projectId,
				role: 'credential:owner',
			});
			await this.credentialDependencyRepository.upsertDependenciesForCredential({
				credentialId: entity.id,
				dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
				dependencyIds: externalSecretProviderIds,
				entityManager: manager,
			});
			return await manager.findOneByOrFail(CredentialsEntity, { id: entity.id });
		});
	}

	async findStartingWith(credentialName: string) {
		return await this.find({
			select: ['name'],
			where: this.excludePendingAuthorization({
				name: Like(`${credentialName}%`),
				usageScope: 'project',
			}),
		});
	}

	async findNonProjectCredentialsByIds(ids: string[]): Promise<CredentialsEntity[]> {
		return await this.find({
			where: { id: In(ids), usageScope: Not('project') },
			select: ['id'],
		});
	}

	/** Filters `ids` down to the global credentials, which every project can use. */
	async findGlobalProjectCredentialIds(ids: string[]): Promise<string[]> {
		if (ids.length === 0) return [];

		const rows = await this.find({
			where: { id: In(ids), isGlobal: true, usageScope: 'project' },
			select: ['id'],
		});

		return rows.map((row) => row.id);
	}

	/** Reads workflow eligibility and access for the package's credential and project IDs. */
	async findPromotionBindingAccess(
		ids: string[],
		projectIds: string[],
	): Promise<
		Array<
			Pick<CredentialsEntity, 'id' | 'type' | 'usageScope' | 'isGlobal'> & { projectIds: string[] }
		>
	> {
		const found = [];
		for (const batch of chunkIds(ids)) {
			const credentials = await this.find({
				where: { id: In(batch) },
				select: ['id', 'type', 'usageScope', 'isGlobal'],
			});
			const projectsByCredential = new Map<string, string[]>();
			for (const projectBatch of chunkIds(projectIds)) {
				const relations = await this.manager.find(SharedCredentials, {
					where: { credentialsId: In(batch), projectId: In(projectBatch) },
					select: ['credentialsId', 'projectId'],
				});
				for (const relation of relations) {
					const projects = projectsByCredential.get(relation.credentialsId) ?? [];
					projects.push(relation.projectId);
					projectsByCredential.set(relation.credentialsId, projects);
				}
			}
			found.push(
				...credentials.map(({ id, type, usageScope, isGlobal }) => ({
					id,
					type,
					usageScope,
					isGlobal,
					projectIds: projectsByCredential.get(id) ?? [],
				})),
			);
		}
		return found;
	}

	/** True when any of the given credentials is a private (resolvable) credential. */
	async hasResolvableCredential(ids: string[]): Promise<boolean> {
		if (ids.length === 0) return false;
		const count = await this.count({ where: { id: In(ids), isResolvable: true } });
		return count > 0;
	}

	async findDanglingProjectCredentials(): Promise<CredentialsEntity[]> {
		return await this.createQueryBuilder('credentials')
			.leftJoinAndSelect('credentials.shared', 'shared')
			.where('shared.credentialsId is null')
			.andWhere('credentials.usageScope = :usageScope', { usageScope: 'project' })
			.getMany();
	}

	async findInstanceCredentialById(
		credentialId: string,
		ctx: OperationContext,
	): Promise<CredentialsEntity | null> {
		return await this.managerFor(ctx).findOneBy(CredentialsEntity, {
			id: credentialId,
			usageScope: 'instance',
		});
	}

	/**
	 * Persists a new project credential, gated on a clearance for its type.
	 *
	 * A create binds to the type hash, not the id: an id here is generated on insert, so nothing
	 * may change `type` between the `enforceCredentialSave` call and this write.
	 */
	async createContent(
		credential: CredentialsEntity,
		ctx: OperationContext,
	): Promise<CredentialsEntity> {
		assertClearedFor(ctx.policyCleared, 'credentialSave', credentialContentSubject(credential));
		return await this.managerFor(ctx).save(CredentialsEntity, credential);
	}

	async updateContent(
		id: string,
		content: QueryDeepPartialEntity<CredentialsEntity>,
		ctx: OperationContext,
	): Promise<void> {
		assertClearedFor(ctx.policyCleared, 'credentialSave', { type: 'credential', id });
		await this.managerFor(ctx).update(CredentialsEntity, id, content);
	}

	async saveInstanceCredential(
		credential: CredentialsEntity,
		ctx: OperationContext,
	): Promise<CredentialsEntity> {
		assertClearedFor(ctx.policyCleared, 'credentialSave', credentialContentSubject(credential));
		return await this.managerFor(ctx).save(CredentialsEntity, credential);
	}

	async updateInstanceCredential(
		credentialId: string,
		data: Pick<ICredentialsDb, 'id' | 'name' | 'type' | 'data'>,
		ctx: OperationContext,
	): Promise<CredentialsEntity | null> {
		assertClearedFor(ctx.policyCleared, 'credentialSave', { type: 'credential', id: credentialId });
		const manager = this.managerFor(ctx);
		await manager.update(CredentialsEntity, { id: credentialId, usageScope: 'instance' }, data);
		return await manager.findOneBy(CredentialsEntity, {
			id: credentialId,
			usageScope: 'instance',
		});
	}

	async deleteInstanceCredentialIfUnassigned(
		credentialId: string,
		ctx: OperationContext = {},
	): Promise<
		| { status: 'deleted' }
		| { status: 'notFound' }
		| { status: 'assigned'; credentialUseIds: string[] }
	> {
		const manager = this.managerFor(ctx);
		const credential = await manager.findOneBy(CredentialsEntity, {
			id: credentialId,
			usageScope: 'instance',
		});
		if (!credential) return { status: 'notFound' };

		const credentialUseIds = await this.instanceCredentialAssignmentRepository.findCredentialUseIds(
			credentialId,
			ctx,
		);
		if (credentialUseIds.length > 0) return { status: 'assigned', credentialUseIds };

		try {
			const result = await manager.delete(CredentialsEntity, {
				id: credentialId,
				usageScope: 'instance',
			});
			return result.affected === 0 ? { status: 'notFound' } : { status: 'deleted' };
		} catch (error) {
			if (error instanceof QueryFailedError && !ctx.trx) {
				const concurrentCredentialUseIds =
					await this.instanceCredentialAssignmentRepository.findCredentialUseIds(credentialId, ctx);
				if (concurrentCredentialUseIds.length > 0) {
					return { status: 'assigned', credentialUseIds: concurrentCredentialUseIds };
				}
			}
			throw error;
		}
	}

	async findManyAndCount(
		listQueryOptions?: CredentialsListQueryOptions,
		credentialIds?: string[],
	): Promise<[CredentialsEntity[], number]> {
		const findManyOptions = this.toFindManyOptions(listQueryOptions);

		if (credentialIds) {
			findManyOptions.where = { ...findManyOptions.where, id: In(credentialIds) };
		}

		const options = this.onlyProjectCredentials(findManyOptions);

		if (listQueryOptions?.includeGlobal) {
			// Globals are visible whatever the sharing filter says; the column filters still apply.
			const { shared: _shared, ...columnFilters } =
				options.where as FindOptionsWhere<CredentialsEntity>;
			options.where = [
				options.where as FindOptionsWhere<CredentialsEntity>,
				{ ...columnFilters, isGlobal: true },
			];
		}

		// `findAndCount` would count over the selected relations too, multiplying the rows
		// it has to scan by every sharing and project member. Count on the filter alone.
		const credentials = await this.find(options);
		const count = await this.count({ where: options.where });
		return [credentials, count];
	}

	private onlyProjectCredentials(
		findManyOptions: FindManyOptions<CredentialsEntity>,
	): FindManyOptions<CredentialsEntity> {
		findManyOptions.where = this.excludePendingAuthorization({
			...findManyOptions.where,
			usageScope: 'project',
		});
		return findManyOptions;
	}

	/**
	 * Narrows a list filter to credentials the user has finished authorizing. A
	 * credential created for an in-flight OAuth popup exists only so the callback
	 * can write to it; lookups by id still find it, lists must not.
	 */
	excludePendingAuthorization(
		where: FindOptionsWhere<CredentialsEntity>,
	): FindOptionsWhere<CredentialsEntity> {
		return { ...where, pendingAuthorizationExpiresAt: IsNull() };
	}

	/** Deletes credentials whose OAuth authorization was never completed in time. */
	async deleteExpiredPendingAuthorizations(now: Date): Promise<number> {
		const result = await this.delete({ pendingAuthorizationExpiresAt: LessThan(now) });
		return result.affected ?? 0;
	}

	private toFindManyOptions(listQueryOptions?: CredentialsListQueryOptions) {
		const findManyOptions: FindManyOptions<CredentialsEntity> = {};

		type Select = Array<keyof CredentialsEntity>;

		const relations = listQueryOptions?.relations ?? DEFAULT_CREDENTIAL_RELATIONS;
		const defaultSelect: Select = [
			'id',
			'name',
			'description',
			'type',
			'isManaged',
			'createdAt',
			'updatedAt',
			'isGlobal',
			'isResolvable',
			'resolverId',
		];

		if (!listQueryOptions) {
			return {
				select: defaultSelect,
				relations,
			} as FindManyOptions<CredentialsEntity>;
		}

		const { filter, select, take, skip, sortBy } = listQueryOptions;

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

		// the credential:connect scope check needs isResolvable whenever isGlobal is selected
		if (select?.isGlobal && !select?.isResolvable) {
			findManyOptions.select = { ...findManyOptions.select, isResolvable: true };
		}

		if (!findManyOptions.select) {
			findManyOptions.select = defaultSelect;
			findManyOptions.relations = relations;
		}

		if (sortBy) {
			const { column, direction } = parseListQuerySortBy(sortBy);
			if (SORTABLE_COLUMNS.has(column)) {
				findManyOptions.order = { [column]: direction };
			}
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

	private handleSharedFilters(listQueryOptions?: CredentialsListQueryOptions): void {
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
		const findManyOptions: FindManyOptions<CredentialsEntity> = {
			where: { id: In(ids), usageScope: 'project' },
		};

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
	 * Find all global credentials.
	 */
	async findAllGlobalCredentials(
		options: { includeData?: boolean } = {},
	): Promise<CredentialsEntity[]> {
		const findManyOptions = this.toFindManyOptions({ includeData: options.includeData ?? false });
		findManyOptions.where = this.excludePendingAuthorization({
			...findManyOptions.where,
			isGlobal: true,
			usageScope: 'project',
		});
		return await this.find(findManyOptions);
	}

	/**
	 * Find all credentials that are owned by a personal project.
	 */
	async findAllPersonalCredentials(): Promise<CredentialsEntity[]> {
		return await this.findBy({
			usageScope: 'project',
			shared: { project: { type: 'personal' } },
		});
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
			usageScope: 'project',
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
		return await this.findBy({ usageScope: 'project', shared: { projectId } });
	}

	/**
	 * Find credentials by name and type, scoped to a specific project.
	 * Used by replaceInvalidCredentials to prevent cross-project credential resolution.
	 */
	async findByNameAndTypeInProject(
		name: string,
		type: string,
		projectId: string,
	): Promise<CredentialsEntity[]> {
		return await this.findBy({ name, type, usageScope: 'project', shared: { projectId } });
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
		options: CredentialsListQueryOptions & {
			filters?: {
				dependency?: CredentialDependencyFilter;
			};
		} = {},
	) {
		const query = this.getManyQueryWithSharingSubquery(user, sharingOptions, options);

		// Get credentials with pagination
		const credentials = await query.getMany();

		// Count on the filter alone: no pagination, no relation joins.
		const countQuery = this.getManyQueryWithSharingSubquery(
			user,
			sharingOptions,
			{ ...options, take: undefined, skip: undefined, select: undefined, sortBy: undefined },
			{ joinRelations: false },
		);
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
		options: CredentialsListQueryOptions & {
			filters?: {
				dependency?: CredentialDependencyFilter;
			};
		} = {},
		{ joinRelations = true }: { joinRelations?: boolean } = {},
	): SelectQueryBuilder<CredentialsEntity> {
		const qb = this.createQueryBuilder('credential');
		qb.andWhere('credential.usageScope = :usageScope', { usageScope: 'project' });
		qb.andWhere('credential.pendingAuthorizationExpiresAt IS NULL');

		if (options.filters?.dependency) {
			addCredentialDependencyExistsFilter(qb, options.filters.dependency);
		}

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

		// Apply the sharing filter using the subquery; globals bypass it when requested.
		const sharingCondition = `credential.id IN (${sharedCredentialSubquery.getQuery()})`;
		if (options.includeGlobal) {
			qb.andWhere(`(${sharingCondition} OR credential.isGlobal = :includeGlobal)`, {
				includeGlobal: true,
			});
		} else {
			qb.andWhere(sharingCondition);
		}
		qb.setParameters(sharedCredentialSubquery.getParameters());

		// Apply other filters
		// projectId is always handled in the subquery, so skip it to avoid issues
		const filtersToApply =
			typeof options.filter?.projectId !== 'undefined'
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
			'description',
			'type',
			'isManaged',
			'createdAt',
			'updatedAt',
			'isGlobal',
			'isResolvable',
			'resolverId',
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

		// Apply relations, same set as `toFindManyOptions`
		if (joinRelations && !options.select) {
			const relations = options.relations ?? DEFAULT_CREDENTIAL_RELATIONS;
			if (relations.includes('shared')) {
				qb.leftJoinAndSelect('credential.shared', 'shared');
			}
			if (relations.includes('shared.project')) {
				qb.leftJoinAndSelect('shared.project', 'project');
			}
			if (relations.includes('shared.project.projectRelations')) {
				qb.leftJoinAndSelect('project.projectRelations', 'projectRelations');
			}
		}

		if (options.sortBy) {
			const { column, direction } = parseListQuerySortBy(options.sortBy);
			if (SORTABLE_COLUMNS.has(column)) {
				qb.addOrderBy(`credential.${column}`, direction);
			}
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
