import { GlobalConfig } from '@n8n/config';
import type { EntityMetadata } from '@n8n/typeorm';
import { DataSource, MigrationExecutor } from '@n8n/typeorm';
import { ApplicationError } from 'n8n-workflow';
import { strict } from 'node:assert';
import { Service } from 'typedi';

import { NonEmptyTableError } from '@/errors/non-empty-table.error';

import type { Sequence, SequenceRow } from './import-export/types';
import { LastMigrationNotFoundError } from '../errors/last-migration-not-found.error';

/**
 * Responsible for providing schema information about the connected DB.
 */
@Service()
export class DatabaseSchemaService {
	private dbType: 'sqlite' | 'mariadb' | 'mysqldb' | 'postgresdb';

	constructor(
		private readonly dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		this.dbType = this.globalConfig.database.type;
	}

	/** Get the name of the last executed migration. */
	async getLastMigration() {
		const migrationExecutor = new MigrationExecutor(this.dataSource);
		const executedMigrations = await migrationExecutor.getExecutedMigrations();
		const lastExecutedMigration = executedMigrations.at(0);

		if (!lastExecutedMigration) throw new LastMigrationNotFoundError();

		return lastExecutedMigration.name;
	}

	getTables() {
		return this.dataSource.entityMetadatas
			.map((value) => ({
				tableName: value.tableName,
				columns: value.columns,
				entityTarget: value.target,
			}))
			.filter(({ entityTarget }) => this.hasTable(entityTarget));
	}

	async checkAllTablesEmpty() {
		for (const { tableName, entityTarget } of this.getTables()) {
			if ((await this.dataSource.getRepository(entityTarget).count()) > 0) {
				throw new NonEmptyTableError(tableName);
			}
		}
	}

	async disableForeignKeysPostgres() {
		strict(this.dbType === 'postgresdb', 'Method only for Postgres');

		await this.dataSource.query('SET session_replication_role = replica;');
	}

	async enableForeignKeysPostgres() {
		strict(this.dbType === 'postgresdb', 'Method only for Postgres');

		await this.dataSource.query('SET session_replication_role = origin;');
	}

	getDataSource() {
		return this.dataSource;
	}

	/** Get the names and values of all incremental ID sequences. */
	async getSequences() {
		if (this.dbType === 'sqlite') {
			const result = await this.dataSource.query<SequenceRow[]>(
				"SELECT name, seq AS value FROM sqlite_sequence WHERE name != 'migrations';",
			);

			return result.reduce<Sequence>((acc, cur) => {
				acc[cur.name] = cur.value;
				return acc;
			}, {});
		}

		if (this.dbType === 'postgresdb') {
			const result = await this.dataSource.query<Sequence[]>(
				"SELECT sequencename AS name, start_value AS value FROM pg_sequences WHERE sequencename != 'migrations_id_seq';",
			);

			return result.reduce<Sequence>((acc, cur) => {
				acc[cur.name] = cur.value;
				return acc;
			}, {});
		}

		// @TODO: Does this work for MariaDB?
		if (this.dbType === 'mysqldb' || this.dbType === 'mariadb') {
			const schema = this.globalConfig.database.mysqldb.database; // @TODO: Why deprecated? How to filter otherwise?
			const result = await this.dataSource.query<Sequence[]>(
				`SELECT table_name AS name, ordinal_position AS value FROM information_schema.columns
				WHERE table_schema = '${schema}' AND extra = 'auto_increment' AND table_name != 'migrations';`,
			);

			return result.reduce<Sequence>((acc, cur) => {
				acc[cur.name] = cur.value;
				return acc;
			}, {});
		}

		throw new ApplicationError('Unknown database type', { extra: { dbType: this.dbType } });
	}

	/** Check whether the given entity target has a corresponding table. */
	private hasTable(entityTarget: EntityMetadata['target']) {
		const prototype: unknown = Object.getPrototypeOf(entityTarget);

		// target is an entity that does not extend a parent class, e.g. `ExecutionEntity`
		// or that extends the `Derived` mixin, e.g. `WorkflowEntity` extends `WithTimestamps`
		if (typeof prototype === 'function' && (!prototype.name || prototype.name === 'Derived')) {
			return true; // @TODO: Too brittle to rely on `'Derived'`?
		}

		// target is an entity that extends another entity, e.g. `AuthUser` extends `User`,
		// or is a string alias for an entity, e.g. `workflows_tags` for `WorkflowTagMapping`
		return false;
	}
}
