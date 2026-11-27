import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { Scope } from '../entities';
import { type OperationContext, TransactionRunner } from '../services/transaction';

class ScopeTable extends BaseRepository<Scope> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Scope, dataSource.manager, transactionRunner);
	}
}

@Service()
export class ScopeRepository {
	private readonly table: ScopeTable;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly logger: Logger,
	) {
		this.table = new ScopeTable(dataSource, transactionRunner);
	}

	async findByList(slugs: string[], ctx: OperationContext) {
		return await this.table.managerFor(ctx).findBy(Scope, { slug: In(slugs) });
	}

	async findByListOrFail(slugs: string[], ctx: OperationContext) {
		const uniqueSlugs = new Set(slugs);
		const scopes = await this.table.managerFor(ctx).findBy(Scope, { slug: In([...uniqueSlugs]) });
		if (scopes.length !== uniqueSlugs.size) {
			const foundSlugSet = new Set(
				scopes.map((s) => s.slug).filter((slug): slug is Scope['slug'] => typeof slug === 'string'),
			);
			const invalidScopesSet = new Set(uniqueSlugs);
			for (const slug of foundSlugSet) {
				invalidScopesSet.delete(slug);
			}
			const message = `The following scopes are invalid: ${[...invalidScopesSet].join(', ')}`;
			this.logger.error(message);
			throw new Error(message);
		}
		return scopes;
	}
}
