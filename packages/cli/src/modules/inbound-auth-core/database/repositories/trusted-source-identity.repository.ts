import { BaseRepository, OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import {
	TrustedSourceIdentityEntity,
	type TrustedSourceIdentityStatus,
} from '../entities/trusted-source-identity.entity';

class TrustedSourceIdentityStore extends BaseRepository<TrustedSourceIdentityEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TrustedSourceIdentityEntity, dataSource.manager, transactionRunner);
	}

	override managerFor(ctx: OperationContext) {
		return super.managerFor(ctx);
	}
}

@Service()
export class TrustedSourceIdentityRepository {
	private readonly store: TrustedSourceIdentityStore;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.store = new TrustedSourceIdentityStore(dataSource, transactionRunner);
	}

	/** Reads the database on every call: an offboarding must take effect on the next resolve. */
	async findBinding(
		sourceId: string,
		subject: string,
		ctx: OperationContext = {},
	): Promise<{ userId: string; status: TrustedSourceIdentityStatus } | null> {
		return await this.store.managerFor(ctx).findOne(TrustedSourceIdentityEntity, {
			select: ['userId', 'status'],
			where: { sourceId, subject },
		});
	}

	async clearByTrustedSourceId(trustedSourceId: string, ctx: OperationContext = {}): Promise<void> {
		await this.store
			.managerFor(ctx)
			.delete(TrustedSourceIdentityEntity, { sourceId: trustedSourceId });
	}
}
