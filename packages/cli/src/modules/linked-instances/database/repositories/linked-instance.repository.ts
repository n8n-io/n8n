import { randomUUID } from 'node:crypto';

import {
	BaseRepository,
	isUniqueConstraintError,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import type { LinkedInstanceStatus } from '../../linked-instances.types';
import { LinkedInstance } from '../entities/linked-instance.entity';

export type NewLinkedInstance = {
	userId: string;
	name: string;
	baseUrl: string;
	tokenEncrypted: string;
	status: LinkedInstanceStatus;
	lastVerifiedAt: Date | null;
};

/** Every query filters by `userId`, so a user can only reach their own links. */
@Service()
export class LinkedInstanceRepository extends BaseRepository<LinkedInstance> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(LinkedInstance, dataSource.manager, transactionRunner);
	}

	async listForUser(userId: string): Promise<LinkedInstance[]> {
		return await this.find({ where: { userId }, order: { createdAt: 'ASC', id: 'ASC' } });
	}

	async findForUser(userId: string, id: string): Promise<LinkedInstance | null> {
		return await this.findOneBy({ id, userId });
	}

	async existsForUser(userId: string, baseUrl: string): Promise<boolean> {
		return await this.existsBy({ userId, baseUrl });
	}

	/**
	 * Returns `null` when the user already linked this address (unique `userId` + `baseUrl`).
	 * The name is not `create`, because the TypeORM repository already has that method.
	 *
	 * Do not give a `ctx` with an open transaction: on Postgres, the unique violation
	 * aborts that transaction, so its later queries fail.
	 */
	async createForUser(
		input: NewLinkedInstance,
		ctx: OperationContext = {},
	): Promise<LinkedInstance | null> {
		const manager = this.managerFor(ctx);
		const row = manager.create(LinkedInstance, { id: randomUUID(), ...input });
		try {
			// `insert` puts the timestamps that the database sets back on `row`. Unlike `save`,
			// it does not first query for a row with this id.
			await manager.insert(LinkedInstance, row);
			return row;
		} catch (error) {
			if (isUniqueConstraintError(error)) return null;
			throw error;
		}
	}

	/** Returns `false` when the user has no link with this id. */
	async deleteForUser(userId: string, id: string): Promise<boolean> {
		const { affected } = await this.delete({ id, userId });
		return (affected ?? 0) > 0;
	}

	/** Returns `false` when the user has no link with this id. */
	async updateStatus(
		userId: string,
		id: string,
		status: LinkedInstanceStatus,
		verifiedAt: Date,
	): Promise<boolean> {
		const { affected } = await this.update({ id, userId }, { status, lastVerifiedAt: verifiedAt });
		return (affected ?? 0) > 0;
	}
}
