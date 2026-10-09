import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In, Like } from '@n8n/typeorm';

import { Settings } from '../entities';
import { BaseRepository } from './base-repository';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';

@Service()
export class SettingsRepository extends BaseRepository<Settings> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Settings, dataSource.manager, transactionRunner);
	}

	async findByKey(key: string, em?: EntityManager): Promise<Settings | null> {
		const manager = em ?? this.manager;
		return await manager.findOneBy(Settings, { key });
	}

	async findByKeyInContext(key: string, ctx: OperationContext): Promise<Settings | null> {
		return await this.managerFor(ctx).findOneBy(Settings, { key });
	}

	async getOrCreateWithReadLock(
		key: string,
		defaultValue: string,
		loadOnStartup: boolean,
		ctx: OperationContext,
	): Promise<Settings> {
		const manager = this.managerFor(ctx);
		await manager
			.createQueryBuilder()
			.insert()
			.into(Settings)
			.values({ key, value: defaultValue, loadOnStartup })
			.orIgnore()
			.execute();
		return await manager.findOneOrFail(Settings, {
			where: { key },
			lock:
				manager.connection.options.type === 'postgres' ? { mode: 'pessimistic_read' } : undefined,
		});
	}

	async upsertByKey(
		key: string,
		value: string,
		loadOnStartup: boolean,
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).upsert(Settings, { key, value, loadOnStartup }, ['key']);
	}

	/**
	 * One-time claim of a key: sets the value only when the key was never
	 * claimed before, and reports whether this call was the claimant. Concurrent
	 * claimants (multi-main boots, parallel saves) resolve to exactly one winner
	 * because only one conditional update can flip the empty marker.
	 */
	async claimKey(key: string, value: string): Promise<boolean> {
		await this.manager
			.createQueryBuilder()
			.insert()
			.into(Settings)
			.values({ key, value: '', loadOnStartup: false })
			.orIgnore()
			.execute();
		const result = await this.manager.update(Settings, { key, value: '' }, { value });
		return (result.affected ?? 0) > 0;
	}

	/**
	 * Stores the value, not loaded on startup, only when the key does not exist yet.
	 * Returns whether the stored value is this value, so exactly one of several
	 * concurrent callers with different values wins.
	 */
	async insertIfAbsent(key: string, value: string): Promise<boolean> {
		await this.manager
			.createQueryBuilder()
			.insert()
			.into(Settings)
			.values({ key, value, loadOnStartup: false })
			.orIgnore()
			.execute();
		const stored = await this.findByKey(key);
		return stored?.value === value;
	}

	async findByKeys(keys: string[]): Promise<Settings[]> {
		return await this.findBy({ key: In(keys) });
	}

	async findByKeyPrefix(prefix: string): Promise<Settings[]> {
		return await this.findBy({ key: Like(`${prefix}%`) });
	}
}
