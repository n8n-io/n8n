import type { Logger } from '@n8n/backend-common';
import type { QueryRunner, ObjectLiteral } from '@n8n/typeorm';

import type { createSchemaBuilder } from './dsl';

export type DatabaseType = 'mariadb' | 'postgresdb' | 'mysqldb' | 'sqlite';

export interface MigrationContext {
	logger: Logger;
	queryRunner: QueryRunner;
	tablePrefix: string;
	dbType: DatabaseType;
	isMysql: boolean;
	isSqlite: boolean;
	isPostgres: boolean;
	dbName: string;
	migrationName: string;
	schemaBuilder: ReturnType<typeof createSchemaBuilder>;
	loadSurveyFromDisk(): string | null;
	parseJson<T>(data: string | T): T;
	escape: {
		columnName(name: string): string;
		tableName(name: string): string;
		indexName(name: string): string;
	};
	runQuery<T>(sql: string, namedParameters?: ObjectLiteral): Promise<T>;
	runInBatches<T>(
		query: string,
		operation: (results: T[]) => Promise<void>,
		limit?: number,
	): Promise<void>;
	copyTable(fromTable: string, toTable: string): Promise<void>;
	copyTable(
		fromTable: string,
		toTable: string,
		fromFields?: string[],
		toFields?: string[],
		batchSize?: number,
	): Promise<void>;
}

export type MigrationFn = (ctx: MigrationContext) => Promise<void>;

export interface BaseMigration {
	up: MigrationFn;
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	down?: MigrationFn | never;
	transaction?: false;
}

export interface ReversibleMigration extends BaseMigration {
	down: MigrationFn;
}

export interface IrreversibleMigration extends BaseMigration {
	down?: never;
}

// eslint-disable-next-line @typescript-eslint/no-restricted-types
export interface Migration extends Function {
	prototype: ReversibleMigration | IrreversibleMigration;
}

export type InsertResult = Array<{ insertId: number }>;

export { QueryFailedError } from '@n8n/typeorm/error/QueryFailedError';
