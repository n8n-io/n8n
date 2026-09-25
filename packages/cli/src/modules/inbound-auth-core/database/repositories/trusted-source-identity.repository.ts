import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { TrustedSourceIdentityEntity } from '../entities/trusted-source-identity.entity';

class TrustedSourceIdentityStore extends BaseRepository<TrustedSourceIdentityEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TrustedSourceIdentityEntity, dataSource.manager, transactionRunner);
	}
}

@Service()
export class TrustedSourceIdentityRepository {
	// ponytail: protected only so noUnusedLocals accepts a field nothing reads yet; private with the first method
	protected readonly store: TrustedSourceIdentityStore;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.store = new TrustedSourceIdentityStore(dataSource, transactionRunner);
	}
}
