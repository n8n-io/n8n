import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { RuntimeCredentialRuleEntity } from '../entities';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';

class RuntimeCredentialRuleTable extends BaseRepository<RuntimeCredentialRuleEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(RuntimeCredentialRuleEntity, dataSource.manager, transactionRunner);
	}
}

export type RuntimeCredentialRuleRow = Pick<
	RuntimeCredentialRuleEntity,
	'alias' | 'nodeType' | 'path' | 'credentialType' | 'transform' | 'allowedDomains'
>;

export type RuntimeCredentialRuleChanges = Partial<
	Pick<RuntimeCredentialRuleEntity, 'nodeType' | 'path' | 'transform' | 'allowedDomains'>
>;

@Service()
export class RuntimeCredentialRuleRepository {
	private readonly table: RuntimeCredentialRuleTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new RuntimeCredentialRuleTable(dataSource, transactionRunner);
	}

	async findAll(ctx: OperationContext): Promise<RuntimeCredentialRuleRow[]> {
		const rows = await this.table
			.managerFor(ctx)
			.find(RuntimeCredentialRuleEntity, { order: { alias: 'ASC' } });
		return rows.map(toRow);
	}

	async findByAlias(alias: string, ctx: OperationContext) {
		const row = await this.table.managerFor(ctx).findOneBy(RuntimeCredentialRuleEntity, { alias });
		return row ? toRow(row) : null;
	}

	/** Throws a unique constraint error when the alias exists. */
	async insertRule(row: RuntimeCredentialRuleRow, ctx: OperationContext) {
		await this.table.managerFor(ctx).insert(RuntimeCredentialRuleEntity, this.table.create(row));
	}

	/** `false` when no rule has the alias. */
	async updateByAlias(
		alias: string,
		changes: RuntimeCredentialRuleChanges,
		ctx: OperationContext,
	): Promise<boolean> {
		if (Object.keys(changes).length === 0) return true;
		const result = await this.table
			.managerFor(ctx)
			.update(RuntimeCredentialRuleEntity, { alias }, changes);
		return result.affected === 1;
	}

	/** `false` when no rule has the alias. */
	async deleteByAlias(alias: string, ctx: OperationContext): Promise<boolean> {
		const result = await this.table.managerFor(ctx).delete(RuntimeCredentialRuleEntity, { alias });
		return result.affected === 1;
	}
}

function toRow(entity: RuntimeCredentialRuleEntity): RuntimeCredentialRuleRow {
	const { alias, nodeType, path, credentialType, transform, allowedDomains } = entity;
	return { alias, nodeType, path, credentialType, transform, allowedDomains };
}
