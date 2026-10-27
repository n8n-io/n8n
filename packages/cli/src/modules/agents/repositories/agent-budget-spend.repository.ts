import { BaseRepository, dbNowLiteral, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, type EntityManager } from '@n8n/typeorm';
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
		const totals = await this.readTotalsWith(this.managerFor({}), [key]);
		return totals.get(key) ?? 0;
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
			if (inserted) await this.incrementKeys(manager, entries);
			const stored = await this.readTotalsWith(
				manager,
				entries.map((entry) => entry.key),
			);
			// Repeated keys share one stored total: walk it back in entry order.
			const unapplied = new Map<string, number>();
			for (const entry of entries) {
				unapplied.set(entry.key, (unapplied.get(entry.key) ?? 0) + entry.usd);
			}
			return entries.map((entry) => {
				const totalUsd = stored.get(entry.key);
				if (totalUsd === undefined) {
					if (inserted) throw new UnexpectedError('Budget spend row is missing after insert');
					// Replay of a call whose spend never landed: the key has no row yet.
					return { key: entry.key, totalUsd: 0, previousUsd: 0 };
				}
				if (!inserted) return { key: entry.key, totalUsd, previousUsd: totalUsd };
				const left = unapplied.get(entry.key) ?? entry.usd;
				const stillLeft = previousTotalUsd(left, entry.usd);
				unapplied.set(entry.key, stillLeft);
				return {
					key: entry.key,
					totalUsd: previousTotalUsd(totalUsd, stillLeft),
					previousUsd: previousTotalUsd(totalUsd, left),
				};
			});
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
	 * Adds each entry's `usd` to its key in one statement.
	 * The addition runs in SQL so two mains cannot drop each other's update.
	 * The SQLite driver discards RETURNING rows on INSERT, so the new totals are
	 * read back in `applySpend`.
	 */
	private async incrementKeys(
		manager: EntityManager,
		entries: AgentBudgetSpendEntry[],
	): Promise<void> {
		if (entries.length === 0) return;
		const table = this.quote(manager, this.tableName(manager, AgentBudgetSpend));
		const keyColumn = this.quote(manager, 'key');
		const totalColumn = this.quote(manager, 'totalUsd');
		const createdAtColumn = this.quote(manager, 'createdAt');
		const updatedAtColumn = this.quote(manager, 'updatedAt');
		const now = dbNowLiteral(this.isPostgres(manager));
		// Coalesce repeated keys: Postgres rejects two rows with the same conflict
		// target in one statement. Sort so concurrent writers lock rows in one order.
		const byKey = new Map<string, number>();
		for (const entry of entries) byKey.set(entry.key, (byKey.get(entry.key) ?? 0) + entry.usd);
		const rows = [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b));
		const values = rows.map((_, i) => `(:key${i}, :usd${i}, ${now}, ${now})`).join(', ');
		const sql =
			`INSERT INTO ${table} (${keyColumn}, ${totalColumn}, ${createdAtColumn}, ${updatedAtColumn}) ` +
			`VALUES ${values} ` +
			`ON CONFLICT (${keyColumn}) DO UPDATE SET ${totalColumn} = ` +
			`${table}.${totalColumn} + EXCLUDED.${totalColumn}, ${updatedAtColumn} = ${now}`;
		const parameters: Record<string, unknown> = {};
		rows.forEach(([key, usd], i) => {
			parameters[`key${i}`] = key;
			parameters[`usd${i}`] = usd;
		});
		await this.execute(manager, sql, parameters);
	}

	private async readTotalsWith(
		manager: EntityManager,
		keys: string[],
	): Promise<Map<string, number>> {
		if (keys.length === 0) return new Map();
		const rows = await manager.findBy(AgentBudgetSpend, { key: In(keys) });
		return new Map(rows.map((row) => [row.key, Number(row.totalUsd)]));
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
