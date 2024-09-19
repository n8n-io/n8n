import { DataSource, MigrationExecutor } from '@n8n/typeorm';
import * as assert from 'assert/strict';
import fs from 'fs';
import { join } from 'path';
import Container from 'typedi';

import { BaseCommand } from '../base-command';
import { jsonColumnType } from '@/databases/entities/abstract-entity';

export class ExportAllCommand extends BaseCommand {
	static description = 'Export Everything';

	static examples = ['$ n8n export:all'];

	// TODO: add `exportPath` flag
	static flags = {};

	async run() {
		const connection = Container.get(DataSource);
		const excludeList = [
			'execution_annotation_tags',
			'execution_annotations',
			'execution_data',
			'execution_entity',
			'execution_metadata',
			'annotation_tag_entity',
		];
		const tables = connection.entityMetadatas
			.filter((v) => !excludeList.includes(v.name))
			.map((v) => ({
				name: v.tableName,
				columns: v.columns,
			}));

		const backupPath = '/tmp/backup';
		await fs.promises.mkdir(backupPath, { recursive: true });

		for (const { name, columns } of tables) {
			// TODO: implement batching
			//const rows = await repo.find({ relations: [] });

			const rows = await connection.query(`SELECT * from ${name}`);

			const stream = fs.createWriteStream(join(backupPath, `${name}.jsonl`));

			for (const row of rows) {
				const data = JSON.stringify(row);

				// TODO: fix the types
				for (const column of columns) {
					// TODO: only do this for sqlite
					//
					//
					//TODO: STOPPED HERE
					if (column.type === jsonColumnType) {
						console.log(column.type);
					}
				}

				stream.write(data);
				stream.write('\n');
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
