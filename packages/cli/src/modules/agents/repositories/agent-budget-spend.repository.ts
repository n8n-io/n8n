import { BaseRepository, dbNowLiteral, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';
import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError } from 'n8n-workflow';

import { AgentBudgetAppliedCall } from '../entities/agent-budget-applied-call.entity';
import { AgentBudgetSpend } from '../entities/agent-budget-spend.entity';

/** One ledger key and the USD amount to add. */
export interface AgentBudgetSpendEntry {
	key: string;
	usd: number;
}

/** Totals for one key after `applySpend`. */
export interface AgentBudgetSpendTotal {
	key: string;
	totalUsd: number;
	previousUsd: number;
}

/**
 * Reconstructs the pre-increment total from the new total. The subtraction
 * keeps the as-applied value under concurrent writers, but binary float adds
 * noise (8.2 - 0.2 = 7.999999999999999) that can re-fire an alert crossing.
 * Twelve significant digits drop the noise and keep real cost precision.
 */
export function previousTotalUsd(totalUsd: number, usd: number): number {
	return Number((totalUsd - usd).toPrecision(12));
}

/**
 * Stores agent budget totals and the call ids that already added spend.
 * `applySpend` inserts the call id and increments the totals in one transaction.
 */
@Service()
export class AgentBudgetSpendRepository extends BaseRepository<AgentBudgetSpend> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentBudgetSpend, dataSource.manager, transactionRunner);
	}

	/** Returns the stored total for a ledger key. A missing key is 0. */
	async readTotal(key: string): Promise<number> {
		return await this.readTotalWith(this.managerFor({}), key);
	}

	/**
	 * Adds spend for one model call.
	 * A repeated callId returns the current totals and does not add again.
	 * The result list follows `entries` order.
	 */
	async applySpend(
		callId: string,
		entries: AgentBudgetSpendEntry[],
	): Promise<AgentBudgetSpendTotal[]> {
		return await this.runInTransaction({}, async (manager) => {
			const inserted = await this.insertAppliedCall(manager, callId);
			if (!inserted) {
				const totals: AgentBudgetSpendTotal[] = [];
				for (const entry of entries) {
					const totalUsd = await this.readTotalWith(manager, entry.key);
					totals.push({ key: entry.key, totalUsd, previousUsd: totalUsd });
				}
				return totals;
			}

			const totals: AgentBudgetSpendTotal[] = [];
			for (const entry of entries) {
				const totalUsd = await this.incrementKey(manager, entry.key, entry.usd);
				totals.push({
					key: entry.key,
					totalUsd,
					previousUsd: previousTotalUsd(totalUsd, entry.usd),
				});
			}
			return totals;
		});
	}

	/** Returns true when this call id is new. A conflict means the call already added spend. */
	private async insertAppliedCall(manager: EntityManager, callId: string): Promise<boolean> {
		const table = this.quote(manager, this.tableName(manager, AgentBudgetAppliedCall));
		const callIdColumn = this.quote(manager, 'callId');
		const createdAtColumn = this.quote(manager, 'createdAt');
		const now = dbNowLiteral(this.isPostgres(manager));
		const sql =
			`INSERT INTO ${table} (${callIdColumn}, ${createdAtColumn}) VALUES (:callId, ${now}) ` +
			`ON CONFLICT (${callIdColumn}) DO NOTHING`;
		const affected = await this.execute(manager, sql, { callId });
		return affected > 0;
	}

	/**
	 * Adds `usd` to the key and returns the new total.
	 * The addition runs in SQL so two mains cannot drop each other's update.
	 * The SQLite driver discards RETURNING rows on INSERT, so the new total is read back here.
	 */
	private async incrementKey(manager: EntityManager, key: string, usd: number): Promise<number> {
		const tableName = this.tableName(manager, AgentBudgetSpend);
		const table = this.quote(manager, tableName);
		const keyColumn = this.quote(manager, 'key');
		const totalColumn = this.quote(manager, 'totalUsd');
		const createdAtColumn = this.quote(manager, 'createdAt');
		const updatedAtColumn = this.quote(manager, 'updatedAt');
		const now = dbNowLiteral(this.isPostgres(manager));
		const sql =
			`INSERT INTO ${table} (${keyColumn}, ${totalColumn}, ${createdAtColumn}, ${updatedAtColumn}) ` +
			`VALUES (:key, :usd, ${now}, ${now}) ` +
			`ON CONFLICT (${keyColumn}) DO UPDATE SET ${totalColumn} = ` +
			`${table}.${totalColumn} + EXCLUDED.${totalColumn}, ${updatedAtColumn} = ${now}`;
		await this.execute(manager, sql, { key, usd });
		const row = await manager.findOneBy(AgentBudgetSpend, { key });
		if (!row) {
			throw new UnexpectedError('Budget spend row is missing after insert');
		}
		return Number(row.totalUsd);
	}

	private async readTotalWith(manager: EntityManager, key: string): Promise<number> {
		const row = await manager.findOneBy(AgentBudgetSpend, { key });
		return row ? Number(row.totalUsd) : 0;
	}

	private async execute(
		manager: EntityManager,
		sql: string,
		parameters: Record<string, unknown>,
	): Promise<number> {
		const queryRunner = manager.queryRunner;
		if (!queryRunner) {
			throw new UnexpectedError('Budget spend write has no query runner');
		}
		const [query, queryParameters] = manager.connection.driver.escapeQueryWithParameters(
			sql,
			parameters,
			{},
		);
		const result: unknown = await queryRunner.query(query, queryParameters, true);
		if (!isRecord(result)) {
			throw new UnexpectedError('Budget spend write returned an unexpected result');
		}
		return typeof result.affected === 'number' ? result.affected : 0;
	}

	private tableName(
		manager: EntityManager,
		target: typeof AgentBudgetSpend | typeof AgentBudgetAppliedCall,
	): string {
		return manager.connection.getMetadata(target).tableName;
	}

	private quote(manager: EntityManager, identifier: string): string {
		return manager.connection.driver.escape(identifier);
	}

	private isPostgres(manager: EntityManager): boolean {
		return manager.connection.options.type === 'postgres';
	}
}
