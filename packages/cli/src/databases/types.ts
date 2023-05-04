import type { Logger } from '@/Logger';
import type { QueryRunner } from 'typeorm';

export type DatabaseType = 'mariadb' | 'postgresdb' | 'mysqldb' | 'sqlite';

export interface MigrationContext {
	logger: Logger;
	queryRunner: QueryRunner;
	tablePrefix: string;
	dbType: DatabaseType;
	dbName: string;
	migrationName: string;
}

type MigrationFn = (ctx: MigrationContext) => Promise<void>;

export interface ReversibleMigration {
	up: MigrationFn;
	down: MigrationFn;
	transaction?: false;
}

export interface IrreversibleMigration {
	up: MigrationFn;
	down?: never;
}

export interface Migration extends Function {
	prototype: ReversibleMigration | IrreversibleMigration;
}

export type InsertResult = Array<{ insertId: number }>;
