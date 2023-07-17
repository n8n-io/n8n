import { readFileSync, rmSync } from 'fs';
import { UserSettings } from 'n8n-core';
import type { QueryRunner } from 'typeorm/query-runner/QueryRunner';
import config from '@/config';
import { getLogger } from '@/Logger';
import { inTest } from '@/constants';
import type { BaseMigration, Migration, MigrationContext, MigrationFn } from '@db/types';

const logger = getLogger();

const PERSONALIZATION_SURVEY_FILENAME = 'personalizationSurvey.json';

export function loadSurveyFromDisk(): string | null {
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
			// eslint-disable-next-line @typescript-eslint/naming-convention
			const emptyKeys = kvPairs.reduce((acc, [_key, value]) => {
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

export const wrapMigration = (migration: Migration) => {
	const dbType = config.getEnv('database.type');
	const dbName = config.getEnv(`database.${dbType === 'mariadb' ? 'mysqldb' : dbType}.database`);
	const tablePrefix = config.getEnv('database.tablePrefix');
	const migrationName = migration.name;
	const context: Omit<MigrationContext, 'queryRunner'> = {
		tablePrefix,
		dbType,
		dbName,
		migrationName,
		logger,
	};

	const { up, down } = migration.prototype;
	Object.assign(migration.prototype, {
		async up(this: BaseMigration, queryRunner: QueryRunner) {
			logMigrationStart(migrationName);
			if (this.transaction === false) {
				await runDisablingForeignKeys(this, { queryRunner, ...context }, up);
			} else {
				await up.call(this, { queryRunner, ...context });
			}
			logMigrationEnd(migrationName);
		},
		async down(this: BaseMigration, queryRunner: QueryRunner) {
			if (down) {
				if (this.transaction === false) {
					await runDisablingForeignKeys(this, { queryRunner, ...context }, up);
				} else {
					await down.call(this, { queryRunner, ...context });
				}
			}
		},
	});
};

export const copyTable = async (
	{ tablePrefix, queryRunner }: Pick<MigrationContext, 'queryRunner' | 'tablePrefix'>,
	fromTable: string,
	toTable: string,
	fromFields: string[] = [],
	toFields: string[] = [],
	batchSize = 10,
) => {
	const driver = queryRunner.connection.driver;
	fromTable = driver.escape(`${tablePrefix}${fromTable}`);
	toTable = driver.escape(`${tablePrefix}${toTable}`);
	const fromFieldsStr = fromFields.length
		? fromFields.map((f) => driver.escape(f)).join(', ')
		: '*';
	const toFieldsStr = toFields.length
		? `(${toFields.map((f) => driver.escape(f)).join(', ')})`
		: '';

	const total = await queryRunner
		.query(`SELECT COUNT(*) as count from ${fromTable}`)
		.then((rows: Array<{ count: number }>) => rows[0].count);

	let migrated = 0;
	while (migrated < total) {
		await queryRunner.query(
			`INSERT INTO ${toTable} ${toFieldsStr} SELECT ${fromFieldsStr} FROM ${fromTable} LIMIT ${migrated}, ${batchSize}`,
		);
		migrated += batchSize;
	}
};

function batchQuery(query: string, limit: number, offset = 0): string {
	return `
			${query}
			LIMIT ${limit}
			OFFSET ${offset}
		`;
}

export async function runInBatches(
	queryRunner: QueryRunner,
	query: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	operation: (results: any[]) => Promise<void>,
	limit = 100,
): Promise<void> {
	let offset = 0;
	let batchedQuery: string;
	let batchedQueryResults: unknown[];

	// eslint-disable-next-line no-param-reassign
	if (query.trim().endsWith(';')) query = query.trim().slice(0, -1);

	do {
		batchedQuery = batchQuery(query, limit, offset);
		batchedQueryResults = (await queryRunner.query(batchedQuery)) as unknown[];
		// pass a copy to prevent errors from mutation
		await operation([...batchedQueryResults]);
		offset += limit;
	} while (batchedQueryResults.length === limit);
}

export const escapeQuery = (
	queryRunner: QueryRunner,
	query: string,
	params: { [property: string]: unknown },
): [string, unknown[]] =>
	queryRunner.connection.driver.escapeQueryWithParameters(
		query,
		{
			pinData: params.pinData,
			id: params.id,
		},
		{},
	);
