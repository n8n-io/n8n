import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import {
	InstanceAiObservationLock,
	type InstanceAiObservationTaskKind,
} from '../entities/instance-ai-observation-lock.entity';

class InstanceAiObservationLockTable extends BaseRepository<InstanceAiObservationLock> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(InstanceAiObservationLock, dataSource.manager, transactionRunner);
	}
}

@Service()
export class InstanceAiObservationLockRepository {
	private readonly table: InstanceAiObservationLockTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new InstanceAiObservationLockTable(dataSource, transactionRunner);
	}

	async updateIfAvailable(
		observationScopeId: string,
		taskKind: InstanceAiObservationTaskKind,
		holderId: string,
		heldUntil: Date,
		now: Date,
		ctx: OperationContext,
	): Promise<boolean> {
		const result = await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.update(InstanceAiObservationLock)
			.set({ taskKind, holderId, heldUntil })
			.where('"observationScopeId" = :observationScopeId')
			.andWhere('"taskKind" = :taskKind')
			.andWhere('("holderId" = :holderId OR "heldUntil" <= :now)')
			.setParameters({ observationScopeId, taskKind, holderId, now })
			.execute();

		return (result.affected ?? 0) > 0;
	}

	async insertIfAbsent(
		observationScopeId: string,
		taskKind: InstanceAiObservationTaskKind,
		holderId: string,
		heldUntil: Date,
		ctx: OperationContext,
	): Promise<void> {
		await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(InstanceAiObservationLock)
			.values({ observationScopeId, taskKind, holderId, heldUntil })
			.orIgnore()
			.execute();
	}

	async findByScopeKindAndHolder(
		observationScopeId: string,
		taskKind: InstanceAiObservationTaskKind,
		holderId: string,
		ctx: OperationContext,
	): Promise<InstanceAiObservationLock | null> {
		return await this.table.managerFor(ctx).findOneBy(InstanceAiObservationLock, {
			observationScopeId,
			taskKind,
			holderId,
		});
	}

	async deleteByScopeKindAndHolder(
		observationScopeId: string,
		taskKind: InstanceAiObservationTaskKind,
		holderId: string,
		ctx: OperationContext,
	): Promise<void> {
		await this.table.managerFor(ctx).delete(InstanceAiObservationLock, {
			observationScopeId,
			taskKind,
			holderId,
		});
	}
}
