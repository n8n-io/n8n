import { DataSource, MigrationExecutor } from '@n8n/typeorm';
import * as assert from 'assert/strict';
import fs from 'fs';
import { join } from 'path';
import Container from 'typedi';

import { BaseCommand } from '../base-command';
import { ApplicationError } from 'n8n-workflow';

// TODO: do this
//const fs = require('fs');
//const readline = require('readline');
//
//(async () => {
//	const fileStream = fs.createReadStream(__dirname + '/test.jsonl');
//	const lineStream = readline.createInterface({
//		input: fileStream,
//		crlfDelay: Infinity,
//	});
//
//	for await (const line of lineStream) {
//		console.log(JSON.parse(line));
//	}
//})();

export class ImportAllCommand extends BaseCommand {
	static description = 'Import Everything';

	static examples = ['$ n8n import:all'];

	// TODO: add `importPath` flag
	// TODO: add `clean` flag
	static flags = {};

	// TODO: do batching
	async run() {
		// TODO:
		// 1. check last migrations
		const connection = Container.get(DataSource);
		const migrationExecutor = new MigrationExecutor(connection);
		const executedMigrations = await migrationExecutor.getExecutedMigrations();
		const lastExecutedMigration = executedMigrations.at(0);

		assert.ok(lastExecutedMigration, 'should have been run by db.ts');

		const backupPath = '/tmp/backup';

		const lastMigrationInBackup = (
			await fs.promises.readFile(join(backupPath, 'lastMigration'), 'utf8')
		).trim();

		if (lastMigrationInBackup !== lastExecutedMigration.name) {
			throw new ApplicationError('Last Migrations Differ, make sure to use the same n8n version');
		}

		// (2. if clean truncate)
		// (2. if no clean, check if tables are empty)
		// 3. disable foreign keys

		// 4. import each jsonl
		const excludeList = [
			'execution_annotation_tags',
			'execution_annotations',
			'execution_data',
			'execution_entity',
			'execution_metadata',
			'annotation_tag_entity',
		];
		const tables = connection.entityMetadatas
			.filter((v) => !excludeList.includes(v.tableName))
			.map((v) => ({ name: v.tableName, target: v.target }));

		for (const { name, target } of tables) {
			const repo = connection.getRepository(target);
			await repo.delete({});

			const rows = (await fs.promises.readFile(`${join(backupPath, name)}.jsonl`, 'utf8'))
				.split('\n')
				.filter((row) => row !== '');

			for (const row of rows) {
				await repo.insert(JSON.parse(row));
			}
		}

		// 5. enable foreign keys
	}

	async catch(error: Error) {
		console.log(error.stack);
		this.logger.error('Error exporting workflows. See log messages for details.');
		this.logger.error(error.message);
	}
}
