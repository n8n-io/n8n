import { readFileSync, rmSync, statSync } from 'fs';
import path from 'path';
import { UserSettings } from 'n8n-core';
import type { QueryRunner } from 'typeorm/query-runner/QueryRunner';
import config from '@/config';
import { getLogger } from '@/Logger';
import { inTest } from '@/constants';
import type { Migration, MigrationContext } from '@db/types';

const logger = getLogger();

const PERSONALIZATION_SURVEY_FILENAME = 'personalizationSurvey.json';

const DESIRED_DATABASE_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB

function getSqliteDbFileSize(): number {
	const filename = path.resolve(
		UserSettings.getUserN8nFolderPath(),
		config.getEnv('database.sqlite.database'),
	);
	const { size } = statSync(filename);
	return size;
}

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

	const migrationsPruningEnabled =
		dbType === 'sqlite' && process.env.MIGRATIONS_PRUNING_ENABLED === 'true';

	const { up, down } = migration.prototype;
	Object.assign(migration.prototype, {
		async beforeTransaction(this: typeof migration.prototype, queryRunner: QueryRunner) {
			if (this.pruneBeforeRunning) {
				if (migrationsPruningEnabled) {
					const dbFileSize = getSqliteDbFileSize();
					if (dbFileSize < DESIRED_DATABASE_FILE_SIZE) {
						console.log(`DB Size not large enough to prune: ${dbFileSize}`);
						return;
					}

					console.time('pruningData');
					const counting = (await queryRunner.query(
						`select count(id) as rows from "${tablePrefix}execution_entity";`,
					)) as Array<{ rows: number }>;

					const averageExecutionSize = dbFileSize / counting[0].rows;
					const numberOfExecutionsToKeep = Math.floor(
						DESIRED_DATABASE_FILE_SIZE / averageExecutionSize,
					);

					const query = `
					SELECT id FROM "${tablePrefix}execution_entity"
					ORDER BY id DESC limit ${numberOfExecutionsToKeep}, 1;
				`;

					const idToKeep = (await queryRunner.query(query)) as Array<{ id: number }>;

					const removalQuery = `
					DELETE FROM "${tablePrefix}execution_entity"
					WHERE id < ${idToKeep[0].id} and status IN ('success');
				`;

					await queryRunner.query(removalQuery);
					console.timeEnd('pruningData');
				} else {
					console.log('Pruning was requested, but was not enabled');
				}
			}
		},
		async up(queryRunner: QueryRunner) {
			logMigrationStart(migrationName);
			await up.call(this, { queryRunner, ...context });
			logMigrationEnd(migrationName);
		},
		async down(queryRunner: QueryRunner) {
			await down?.call(this, { queryRunner, ...context });
		},
	});
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
