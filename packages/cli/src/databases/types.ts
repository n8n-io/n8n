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

export interface MigrationInterface {
	transaction?: boolean;
	up: MigrationFn;
	down?: MigrationFn;
}

export interface MigrationClass extends Function {
	prototype: MigrationInterface;
}

export type InsertResult = Array<{ insertId: number }>;
