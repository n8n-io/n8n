import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { TrustedSourceEntity } from '../entities/trusted-source.entity';

class TrustedSourceStore extends BaseRepository<TrustedSourceEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TrustedSourceEntity, dataSource.manager, transactionRunner);
	}
}

@Service()
export class TrustedSourceRepository {
	// ponytail: protected only so noUnusedLocals accepts a field nothing reads yet; private with the first method
	protected readonly store: TrustedSourceStore;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.store = new TrustedSourceStore(dataSource, transactionRunner);
	}
}
