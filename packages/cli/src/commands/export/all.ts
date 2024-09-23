import { DataSource, MigrationExecutor } from '@n8n/typeorm';
import * as assert from 'assert/strict';
import fs from 'fs';
import { join } from 'path';
import Container from 'typedi';

import { jsonColumnType } from '@/databases/entities/abstract-entity';
import { BaseCommand } from '../base-command';

/** These tables are not backed up to reduce the backup size */
const excludeList = [
	'execution_annotation_tags',
	'execution_annotations',
	'execution_data',
	'execution_entity',
	'execution_metadata',
	'annotation_tag_entity',
];

export class ExportAllCommand extends BaseCommand {
	static description = 'Export Everything';

	static examples = ['$ n8n export:all'];

	// TODO: add `exportPath` flag
	static flags = {};

	async run() {
		const connection = Container.get(DataSource);
		const tables = connection.entityMetadatas
			.filter((v) => !excludeList.includes(v.tableName))
			.map((v) => ({
				name: v.tableName,
				columns: v.columns,
			}));

		const backupPath = '/tmp/backup';
		await fs.promises.mkdir(backupPath, { recursive: true });

		for (const { name: tableName, columns } of tables) {
			const totalRowsCount = await connection
				.query(`SELECT COUNT(*) AS count FROM ${tableName}`)
				.then((rows: Array<{ count: number }>) => rows[0].count);
			if (totalRowsCount === 0) continue;

			const stream = fs.createWriteStream(join(backupPath, `${tableName}.jsonl`));

			let cursor = 0;
			const batchSize = 10;
			while (cursor < totalRowsCount) {
				const rows = await connection.query(
					`SELECT * from ${tableName} LIMIT ${cursor}, ${batchSize}`,
				);

				for (const row of rows) {
					// Our sqlite setup has some quirks. The following code normalizes the exported data so that it can be imported into a new postgres or sqlite database.
					if (this.globalConfig.database.type === 'sqlite') {
						for (const { type: columnType, propertyName } of columns) {
							if (propertyName in row) {
								// Our sqlite setup used `simple-json` for JSON columns, which is stored as strings.
								// This is because when we wrote this code, sqlite did not support native JSON column types.
								if (columnType === jsonColumnType) {
									row[propertyName] = JSON.parse(row[propertyName]);
								}
								// Sqlite does not have a separate Boolean data type, and uses integers 0/1 to mark values as boolean
								else if (columnType === Boolean) {
									row[propertyName] = Boolean(row[propertyName]);
								}
							}
						}
					}

					stream.write(JSON.stringify(row));
					stream.write('\n');
				}

				cursor += batchSize;
			}

			stream.end();
		}

		const migrationExecutor = new MigrationExecutor(connection);
		const executedMigrations = await migrationExecutor.getExecutedMigrations();
		const lastExecutedMigration = executedMigrations.at(0);

		assert.ok(lastExecutedMigration, 'should have been run by db.ts');

		await fs.promises.writeFile(
			join(backupPath, 'lastMigration'),
			lastExecutedMigration.name,
			'utf8',
		);
	}

	async catch(error: Error) {
		this.logger.error('Error exporting workflows. See log messages for details.');
		this.logger.error(error.message);
	}
}
