import { Container } from 'typedi';
import { readFileSync, rmSync } from 'fs';
import { UserSettings } from 'n8n-core';
import type { ObjectLiteral } from 'typeorm';
import type { QueryRunner } from 'typeorm/query-runner/QueryRunner';
import config from '@/config';
import { inTest } from '@/constants';
import type { BaseMigration, Migration, MigrationContext, MigrationFn } from '@db/types';
import { getLogger } from '@/Logger';
import { NodeTypes } from '@/NodeTypes';
import { jsonParse } from 'n8n-workflow';

const logger = getLogger();

const PERSONALIZATION_SURVEY_FILENAME = 'personalizationSurvey.json';

function loadSurveyFromDisk(): string | null {
	const userSettingsPath = UserSettings.getUserN8nFolderPath();
	try {
		const filename = `${userSettingsPath}/${PERSONALIZATION_SURVEY_FILENAME}`;
		const surveyFile = readFileSync(filename, 'utf-8');
		rmSync(filename);
		const personalizationSurvey = JSON.parse(surveyFile) as object;
		const kvPairs = Object.entries(personalizationSurvey);
		if (!kvPairs.length) {
			throw new Error('personalizationSurvey is empty');
		} else {
			const emptyKeys = kvPairs.reduce((acc, [, value]) => {
				if (!value || (Array.isArray(value) && !value.length)) {
					return acc + 1;
				}
				return acc;
			}, 0);
			if (emptyKeys === kvPairs.length) {
				throw new Error('incomplete personalizationSurvey');
			}
		}
		return surveyFile;
	} catch (error) {
		return null;
	}
}

let runningMigrations = false;

function logMigrationStart(migrationName: string): void {
	if (inTest) return;

	if (!runningMigrations) {
		logger.warn('Migrations in progress, please do NOT stop the process.');
		runningMigrations = true;
	}

	logger.debug(`Starting migration ${migrationName}`);
}

function logMigrationEnd(migrationName: string): void {
	if (inTest) return;

	logger.debug(`Finished migration ${migrationName}`);
}

const runDisablingForeignKeys = async (
	migration: BaseMigration,
	context: MigrationContext,
	fn: MigrationFn,
) => {
	const { dbType, queryRunner } = context;
	if (dbType !== 'sqlite') throw new Error('Disabling transactions only available in sqlite');
	await queryRunner.query('PRAGMA foreign_keys=OFF');
	await queryRunner.startTransaction();
	try {
		await fn.call(migration, context);
		await queryRunner.commitTransaction();
	} catch (e) {
		try {
			await queryRunner.rollbackTransaction();
		} catch {}
		throw e;
	} finally {
		await queryRunner.query('PRAGMA foreign_keys=ON');
	}
};

function parseJson<T>(data: string | T): T {
	return typeof data === 'string' ? jsonParse<T>(data) : data;
}

const dbType = config.getEnv('database.type');
const isMysql = ['mariadb', 'mysqldb'].includes(dbType);
const dbName = config.getEnv(`database.${dbType === 'mariadb' ? 'mysqldb' : dbType}.database`);
const tablePrefix = config.getEnv('database.tablePrefix');

const createContext = (queryRunner: QueryRunner, migration: Migration): MigrationContext => ({
	logger,
	tablePrefix,
	dbType,
	isMysql,
	dbName,
	migrationName: migration.name,
	queryRunner,
	nodeTypes: Container.get(NodeTypes),
	loadSurveyFromDisk,
	parseJson,
	escape: {
		columnName: (name) => queryRunner.connection.driver.escape(name),
		tableName: (name) => queryRunner.connection.driver.escape(`${tablePrefix}${name}`),
		indexName: (name) => queryRunner.connection.driver.escape(`IDX_${tablePrefix}${name}`),
	},
	runQuery: async <T>(
		sql: string,
		unsafeParameters?: ObjectLiteral,
		safeParameters?: ObjectLiteral,
	) => {
		if (unsafeParameters) {
			const [query, parameters] = queryRunner.connection.driver.escapeQueryWithParameters(
				sql,
				unsafeParameters,
				safeParameters ?? {},
			);
			return queryRunner.query(query, parameters) as Promise<T>;
		} else {
			return queryRunner.query(sql) as Promise<T>;
		}
	},
	runInBatches: async <T>(
		query: string,
		operation: (results: T[]) => Promise<void>,
		limit = 100,
	) => {
		let offset = 0;
		let batchedQuery: string;
		let batchedQueryResults: T[];

		if (query.trim().endsWith(';')) query = query.trim().slice(0, -1);

		do {
			batchedQuery = `${query} LIMIT ${limit} OFFSET ${offset}`;
			batchedQueryResults = (await queryRunner.query(batchedQuery)) as T[];
			// pass a copy to prevent errors from mutation
			await operation([...batchedQueryResults]);
			offset += limit;
		} while (batchedQueryResults.length === limit);
	},
	copyTable: async (
		fromTable: string,
		toTable: string,
		fromFields?: string[],
		toFields?: string[],
		batchSize?: number,
	) => {
		const { driver } = queryRunner.connection;
		fromTable = driver.escape(`${tablePrefix}${fromTable}`);
		toTable = driver.escape(`${tablePrefix}${toTable}`);
		const fromFieldsStr = fromFields?.length
			? fromFields.map((f) => driver.escape(f)).join(', ')
			: '*';
		const toFieldsStr = toFields?.length
			? `(${toFields.map((f) => driver.escape(f)).join(', ')})`
			: '';

		const total = await queryRunner
			.query(`SELECT COUNT(*) AS count FROM ${fromTable}`)
			.then((rows: Array<{ count: number }>) => rows[0].count);

		batchSize = batchSize ?? 10;
		let migrated = 0;
		while (migrated < total) {
			await queryRunner.query(
				`INSERT INTO ${toTable} ${toFieldsStr} SELECT ${fromFieldsStr} FROM ${fromTable} LIMIT ${migrated}, ${batchSize}`,
			);
			migrated += batchSize;
		}
	},
});

export const wrapMigration = (migration: Migration) => {
	const { up, down } = migration.prototype;
	Object.assign(migration.prototype, {
		async up(this: BaseMigration, queryRunner: QueryRunner) {
			logMigrationStart(migration.name);
			const context = createContext(queryRunner, migration);
			if (this.transaction === false) {
				await runDisablingForeignKeys(this, context, up);
			} else {
				await up.call(this, context);
			}
			logMigrationEnd(migration.name);
		},
		async down(this: BaseMigration, queryRunner: QueryRunner) {
			if (down) {
				const context = createContext(queryRunner, migration);
				if (this.transaction === false) {
					await runDisablingForeignKeys(this, context, up);
				} else {
					await down.call(this, context);
				}
			}
		},
	});
};
