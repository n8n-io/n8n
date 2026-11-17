import type { InboxCounts, InboxState, PromotionDirection } from '@n8n/api-types';
import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { Brackets, DataSource, In, type SelectQueryBuilder } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

import type { InboxSourceQuery } from '../../../inbox/inbox-source.registry';
import {
	PromotionOwnerRequest,
	type PromotionOwnerRequestCloseReason,
	type PromotionOwnerRequestResourceKind,
} from '../entities/promotion-owner-request.entity';

class PromotionOwnerRequestTable extends BaseRepository<PromotionOwnerRequest> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PromotionOwnerRequest, dataSource.manager, transactionRunner);
	}
}

export type NewPromotionOwnerRequest = Pick<
	PromotionOwnerRequest,
	| 'environmentId'
	| 'direction'
	| 'resourceKind'
	| 'resourceId'
	| 'resourceName'
	| 'credentialType'
	| 'ownerProjectId'
	| 'requesterId'
	| 'consumerWorkflowId'
>;

/**
 * The requests that one user may receive, for each operation. `all` holds for an instance admin:
 * every request of the operation, also one whose owner project is not on this instance.
 */
export type OwnerRequestRecipientScope = Record<
	PromotionDirection,
	{ all: boolean; projectIds: readonly string[] }
>;

export type OwnerRequestResource = { kind: PromotionOwnerRequestResourceKind; id: string };

const RESOURCE_KINDS: PromotionOwnerRequestResourceKind[] = ['credential', 'workflow'];

@Service()
export class PromotionOwnerRequestRepository {
	private readonly table: PromotionOwnerRequestTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new PromotionOwnerRequestTable(dataSource, transactionRunner);
	}

	/**
	 * Inserts the request unless the requester already has an open one for the same resource,
	 * operation and environment. The unique index decides, so two calls at the same time make one row.
	 */
	async insertIfAbsent(request: NewPromotionOwnerRequest, ctx: OperationContext = {}) {
		await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(PromotionOwnerRequest)
			// `values` skips `@BeforeInsert`, so the id is set here.
			.values({ ...request, id: uuidv7(), state: 'open', closeReason: null })
			.orIgnore()
			.execute();
	}

	/** The resources that the user already asked for and that still wait. */
	async findOpenResourcesByRequester(
		requesterId: string,
		environmentId: string,
		direction: PromotionDirection,
		ctx: OperationContext = {},
	): Promise<OwnerRequestResource[]> {
		const rows = await this.table.managerFor(ctx).find(PromotionOwnerRequest, {
			select: { resourceKind: true, resourceId: true },
			where: { requesterId, environmentId, direction, state: 'open' },
		});
		return rows.map(({ resourceKind, resourceId }) => ({ kind: resourceKind, id: resourceId }));
	}

	async findByIdWithRelations(id: string, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).findOne(PromotionOwnerRequest, {
			where: { id },
			relations: { environment: true, ownerProject: true, requester: true },
		});
	}

	/** Every open request. The sweep that closes satisfied requests reads these. */
	async findOpen(ctx: OperationContext = {}): Promise<PromotionOwnerRequest[]> {
		return await this.table
			.managerFor(ctx)
			.find(PromotionOwnerRequest, { where: { state: 'open' }, order: { createdAt: 'ASC' } });
	}

	async findForInbox(
		{ state, limit, boundary }: InboxSourceQuery,
		scope: OwnerRequestRecipientScope,
		ctx: OperationContext = {},
	): Promise<PromotionOwnerRequest[]> {
		const query = this.recipientQuery(state, scope, ctx);
		if (!query) return [];
		query
			.leftJoinAndSelect('request.environment', 'environment')
			.leftJoinAndSelect('request.ownerProject', 'ownerProject')
			.leftJoinAndSelect('request.requester', 'requester')
			// A query builder skips eager relations, and a service account's name is in `details`.
			.leftJoinAndSelect('requester.details', 'requesterDetails')
			.orderBy('request.updatedAt', 'DESC')
			.addOrderBy('request.id', 'ASC')
			.limit(limit);
		if (boundary?.mode === 'afterItem') {
			query.andWhere(
				'(request.updatedAt < :at OR (request.updatedAt = :at AND request.id > :id))',
				{ at: boundary.updatedAt, id: boundary.id },
			);
		} else if (boundary) {
			const operator = boundary.mode === 'beforeOrAtTime' ? '<=' : '<';
			query.andWhere(`request.updatedAt ${operator} :at`, { at: boundary.updatedAt });
		}
		return await query.getMany();
	}

	async countForInbox(
		scope: OwnerRequestRecipientScope,
		ctx: OperationContext = {},
	): Promise<InboxCounts> {
		const [open, closed] = await Promise.all([
			this.recipientQuery('open', scope, ctx)?.getCount() ?? 0,
			this.recipientQuery('closed', scope, ctx)?.getCount() ?? 0,
		]);
		return { open, closed };
	}

	/** Closes one request while it is open. Returns whether it closed. */
	async close(
		id: string,
		closeReason: PromotionOwnerRequestCloseReason,
		at: Date,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.table
			.managerFor(ctx)
			.update(
				PromotionOwnerRequest,
				{ id, state: 'open' },
				{ state: 'closed', closeReason, updatedAt: at },
			);
		return (result.affected ?? 0) > 0;
	}

	/** Closes the open requests among `ids`. Returns how many closed. */
	async closeMany(
		ids: readonly string[],
		closeReason: PromotionOwnerRequestCloseReason,
		at: Date,
		ctx: OperationContext = {},
	): Promise<number> {
		if (ids.length === 0) return 0;
		const result = await this.table
			.managerFor(ctx)
			.update(
				PromotionOwnerRequest,
				{ id: In([...ids]), state: 'open' },
				{ state: 'closed', closeReason, updatedAt: at },
			);
		return result.affected ?? 0;
	}

	/**
	 * Closes the open requests of one environment and operation that ask for one of the
	 * resources. Returns how many closed.
	 */
	async closeForResources(
		environmentId: string,
		direction: PromotionDirection,
		resources: readonly OwnerRequestResource[],
		closeReason: PromotionOwnerRequestCloseReason,
		at: Date,
		ctx: OperationContext = {},
	): Promise<number> {
		let closed = 0;
		for (const resourceKind of RESOURCE_KINDS) {
			const ids = resources.filter(({ kind }) => kind === resourceKind).map(({ id }) => id);
			if (ids.length === 0) continue;
			const result = await this.table
				.managerFor(ctx)
				.update(
					PromotionOwnerRequest,
					{ environmentId, direction, resourceKind, resourceId: In(ids), state: 'open' },
					{ state: 'closed', closeReason, updatedAt: at },
				);
			closed += result.affected ?? 0;
		}
		return closed;
	}

	/** `null` when the user can receive no request, so the caller skips the query. */
	private recipientQuery(
		state: InboxState,
		scope: OwnerRequestRecipientScope,
		ctx: OperationContext,
	): SelectQueryBuilder<PromotionOwnerRequest> | null {
		const directions = (['promote', 'apply'] as const).filter(
			(direction) => scope[direction].all || scope[direction].projectIds.length > 0,
		);
		if (directions.length === 0) return null;

		return this.table
			.managerFor(ctx)
			.createQueryBuilder(PromotionOwnerRequest, 'request')
			.where('request.state = :state', { state })
			.andWhere(
				new Brackets((anyDirection) => {
					for (const direction of directions) {
						const { all, projectIds } = scope[direction];
						anyDirection.orWhere(
							new Brackets((one) => {
								one.where(`request.direction = :${direction}Direction`, {
									[`${direction}Direction`]: direction,
								});
								if (all) return;
								one.andWhere(`request.ownerProjectId IN (:...${direction}ProjectIds)`, {
									[`${direction}ProjectIds`]: [...projectIds],
								});
							}),
						);
					}
				}),
			);
	}
}
