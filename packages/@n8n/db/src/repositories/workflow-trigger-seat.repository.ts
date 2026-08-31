import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, In, MoreThanOrEqual } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import { WorkflowTriggerSeat } from '../entities';
import { BaseRepository } from './base-repository';
import type { TriggerSeatActualState, TriggerSeatFence } from '../entities/workflow-trigger-seat';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';
import { dbNowLiteral, dbNowPlusMsLiteral } from '../utils/dialect-time';

/**
 * Leasable replica slots ("seats") of in-memory trigger nodes.
 *
 * Every lease write is guarded on `holderId` + `leaseEpoch`; zero rows
 * affected means the seat is no longer ours and is benign, never an error.
 * The claim is the only write that bumps the epoch, so the epoch is the
 * fencing token: effects of a holder whose seat was re-claimed never land.
 */
@Service()
export class WorkflowTriggerSeatRepository extends BaseRepository<WorkflowTriggerSeat> {
	private readonly isPostgres: boolean;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		config: DatabaseConfig,
	) {
		super(WorkflowTriggerSeat, dataSource.manager, transactionRunner);
		this.isPostgres = config.type === 'postgresdb';
	}

	/**
	 * Projects a trigger node's desired replication: seats `0..seatCount-1`
	 * become active at `versionId`, any higher-indexed leftovers become
	 * inactive. Idempotent; existing leases are left untouched so holders
	 * observe the change and converge.
	 */
	async upsertDesiredSeats(
		workflowId: string,
		nodeId: string,
		seatCount: number,
		versionId: string,
		ctx: OperationContext = {},
	): Promise<void> {
		const manager = this.managerFor(ctx);

		for (let seatIndex = 0; seatIndex < seatCount; seatIndex++) {
			const updated = await manager
				.createQueryBuilder()
				.update(WorkflowTriggerSeat)
				.set({
					desiredState: 'active',
					desiredVersionId: versionId,
					updatedAt: () => dbNowLiteral(this.isPostgres),
				} as QueryDeepPartialEntity<WorkflowTriggerSeat>)
				.where({ workflowId, nodeId, seatIndex })
				.execute();

			if (updated.affected === 0) {
				await manager
					.createQueryBuilder()
					.insert()
					.into(WorkflowTriggerSeat)
					.values({
						workflowId,
						nodeId,
						seatIndex,
						desiredState: 'active',
						desiredVersionId: versionId,
					} as QueryDeepPartialEntity<WorkflowTriggerSeat>)
					.orIgnore()
					.execute();
			}
		}

		await manager
			.createQueryBuilder()
			.update(WorkflowTriggerSeat)
			.set({
				desiredState: 'inactive',
				updatedAt: () => dbNowLiteral(this.isPostgres),
			} as QueryDeepPartialEntity<WorkflowTriggerSeat>)
			.where({ workflowId, nodeId, seatIndex: MoreThanOrEqual(seatCount) })
			.execute();
	}

	/** Marks every seat of the given nodes inactive, so holders tear down. */
	async markSeatsInactive(
		workflowId: string,
		nodeIds: string[],
		ctx: OperationContext = {},
	): Promise<void> {
		if (nodeIds.length === 0) return;
		await this.managerFor(ctx)
			.createQueryBuilder()
			.update(WorkflowTriggerSeat)
			.set({
				desiredState: 'inactive',
				updatedAt: () => dbNowLiteral(this.isPostgres),
			} as QueryDeepPartialEntity<WorkflowTriggerSeat>)
			.where({ workflowId, nodeId: In(nodeIds) })
			.execute();
	}

	/** How many seats of the given nodes their holders still report as registered. */
	async countRegisteredSeats(
		workflowId: string,
		nodeIds: string[],
		ctx: OperationContext = {},
	): Promise<number> {
		if (nodeIds.length === 0) return 0;
		return await this.managerFor(ctx).count(WorkflowTriggerSeat, {
			where: { workflowId, nodeId: In(nodeIds), actualState: 'registered' },
		});
	}

	async deleteSeatsForWorkflow(workflowId: string, ctx: OperationContext = {}): Promise<void> {
		await this.managerFor(ctx).delete(WorkflowTriggerSeat, { workflowId });
	}

	/**
	 * Every seat a reconcile tick cares about: seats that should be running,
	 * plus inactive seats still held (their holders owe a teardown).
	 */
	async findAllRelevantSeats(ctx: OperationContext = {}): Promise<WorkflowTriggerSeat[]> {
		return await this.managerFor(ctx)
			.createQueryBuilder(WorkflowTriggerSeat, 'seat')
			.where("seat.desiredState = 'active'")
			.orWhere('seat.holderId IS NOT NULL')
			.getMany();
	}

	/**
	 * Claims a vacant or lease-expired active seat, bumping the fencing epoch.
	 *
	 * @returns The new lease epoch, or `null` if the seat was not claimable
	 *   (held with a live lease, inactive, or gone).
	 */
	async claim(
		seatId: string,
		runnerId: string,
		leaseMs: number,
		ctx: OperationContext = {},
	): Promise<number | null> {
		const manager = this.managerFor(ctx);

		const result = await manager
			.createQueryBuilder()
			.update(WorkflowTriggerSeat)
			.set({
				holderId: runnerId,
				leaseExpiresAt: () => dbNowPlusMsLiteral(this.isPostgres, leaseMs),
				leaseEpoch: () => '"leaseEpoch" + 1',
				desiredHolderId: null,
				lastError: null,
				updatedAt: () => dbNowLiteral(this.isPostgres),
			} as QueryDeepPartialEntity<WorkflowTriggerSeat>)
			.where('id = :seatId', { seatId })
			.andWhere('"desiredState" = \'active\'')
			.andWhere(`("holderId" IS NULL OR "leaseExpiresAt" < ${dbNowLiteral(this.isPostgres)})`)
			.execute();

		if (result.affected !== 1) return null;

		const row = await manager.findOne(WorkflowTriggerSeat, {
			select: ['leaseEpoch'],
			where: { id: seatId, holderId: runnerId },
		});
		return row?.leaseEpoch ?? null;
	}

	/** Extends the lease. `false` means the seat is no longer ours. */
	async renew(
		seatId: string,
		runnerId: string,
		leaseEpoch: number,
		leaseMs: number,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.managerFor(ctx)
			.createQueryBuilder()
			.update(WorkflowTriggerSeat)
			.set({
				leaseExpiresAt: () => dbNowPlusMsLiteral(this.isPostgres, leaseMs),
				updatedAt: () => dbNowLiteral(this.isPostgres),
			} as QueryDeepPartialEntity<WorkflowTriggerSeat>)
			.where({ id: seatId, holderId: runnerId, leaseEpoch })
			.execute();
		return result.affected === 1;
	}

	/**
	 * Vacates the seat without bumping the epoch. `false` means it wasn't ours.
	 * A pending handoff request survives the release, so the requester — not the
	 * rendezvous ranking — claims the vacancy it asked for.
	 */
	async release(
		seatId: string,
		runnerId: string,
		leaseEpoch: number,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.managerFor(ctx)
			.createQueryBuilder()
			.update(WorkflowTriggerSeat)
			.set({
				holderId: null,
				leaseExpiresAt: null,
				updatedAt: () => dbNowLiteral(this.isPostgres),
			} as QueryDeepPartialEntity<WorkflowTriggerSeat>)
			.where({ id: seatId, holderId: runnerId, leaseEpoch })
			.execute();
		return result.affected === 1;
	}

	/** Records what the holder is actually doing with the seat. */
	async reportActual(
		seatId: string,
		runnerId: string,
		leaseEpoch: number,
		actual: { state: TriggerSeatActualState; versionId?: string | null; error?: string | null },
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.managerFor(ctx)
			.createQueryBuilder()
			.update(WorkflowTriggerSeat)
			.set({
				actualState: actual.state,
				actualVersionId: actual.versionId ?? null,
				lastError: actual.error ?? null,
				updatedAt: () => dbNowLiteral(this.isPostgres),
			} as QueryDeepPartialEntity<WorkflowTriggerSeat>)
			.where({ id: seatId, holderId: runnerId, leaseEpoch })
			.execute();
		return result.affected === 1;
	}

	/**
	 * Politely asks the current holder to release the seat. Set only when no
	 * other handoff is pending; the holder honors it on its next tick.
	 */
	async requestHandoff(
		seatId: string,
		toRunnerId: string,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.managerFor(ctx)
			.createQueryBuilder()
			.update(WorkflowTriggerSeat)
			.set({
				desiredHolderId: toRunnerId,
				updatedAt: () => dbNowLiteral(this.isPostgres),
			} as QueryDeepPartialEntity<WorkflowTriggerSeat>)
			.where({ id: seatId })
			.andWhere('"desiredHolderId" IS NULL')
			.andWhere('"holderId" IS NOT NULL')
			.andWhere('"holderId" != :toRunnerId', { toRunnerId })
			.execute();
		return result.affected === 1;
	}

	/**
	 * The fence: asserts the emitting holder still owns the seat at this epoch
	 * and that the seat still wants the version the trigger was registered for.
	 * Run inside the same transaction as the execution insert. On Postgres the
	 * row is locked FOR SHARE so a concurrent claim can't slip between the
	 * check and the commit; on SQLite the single-writer model makes the plain
	 * read equivalent.
	 *
	 * Deliberately does not check `leaseExpiresAt`: an expired-but-unreclaimed
	 * lease still commits. Correctness comes from epoch monotonicity, not clocks.
	 */
	async assertSeatHeld(fence: TriggerSeatFence, ctx: OperationContext): Promise<boolean> {
		const manager = this.managerFor(ctx);
		const row = await manager.findOne(WorkflowTriggerSeat, {
			select: ['id'],
			where: {
				id: fence.seatId,
				holderId: fence.holderId,
				leaseEpoch: fence.leaseEpoch,
				desiredVersionId: fence.versionId,
				desiredState: 'active',
			},
			...(this.isPostgres ? { lock: { mode: 'pessimistic_read' as const } } : {}),
		});
		return row !== null;
	}
}
