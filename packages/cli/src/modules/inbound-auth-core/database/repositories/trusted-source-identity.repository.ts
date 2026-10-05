import { BaseRepository, OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { TrustedSourceIdentityEntity } from '../entities/trusted-source-identity.entity';

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

	async clearByTrustedSourceId(trustedSourceId: string, ctx: OperationContext = {}): Promise<void> {
		await this.store
			.managerFor(ctx)
			.delete(TrustedSourceIdentityEntity, { sourceId: trustedSourceId });
	}
}
