import { Flags } from '@oclif/core';
import { DataSource, MigrationExecutor } from '@n8n/typeorm';
import * as assert from 'assert/strict';
import fs from 'fs';
import readline from 'readline';
import { join } from 'path';
import Container from 'typedi';
import { tmpdir } from 'node:os';
import { pipeline } from 'node:stream/promises';
import { Extract } from 'unzip-stream';

import { BaseCommand } from '../base-command';
import { ApplicationError } from 'n8n-workflow';

const excludeList = [
	'execution_annotation_tags',
	'execution_annotations',
	'execution_data',
	'execution_entity',
	'execution_metadata',
	'annotation_tag_entity',
];

export class ImportAllCommand extends BaseCommand {
	static description = 'Import Everything';

	static examples = ['$ n8n import:all', '$ n8n import:all --input=backup.zip'];

	// TODO: add `clean` flag, or add a prompt to confirm DB truncation
	static flags = {
		input: Flags.string({
			char: 'o',
			description: 'Directory to load the archive file from',
			default: tmpdir(),
		}),
	};

	// TODO: do batching
	async run() {
		const { flags } = await this.parse(ImportAllCommand);
		// TODO:
		// 1. check last migrations
		const connection = Container.get(DataSource);
		const migrationExecutor = new MigrationExecutor(connection);
		const executedMigrations = await migrationExecutor.getExecutedMigrations();
		const lastExecutedMigration = executedMigrations.at(0);

		assert.ok(lastExecutedMigration, 'should have been run by db.ts');

		const zipPath = join(flags.input, 'n8n-backup.zip');
		if (!fs.existsSync(zipPath)) {
			throw new ApplicationError('Backup zip file not count');
		}

		// TODO: instead of extracting to the filesystem, stream the files directly
		const backupPath = '/tmp/backup';
		await pipeline(fs.createReadStream(zipPath), Extract({ path: backupPath }));

		const lastMigrationInBackup = (
			await fs.promises.readFile(join(backupPath, '.lastMigration'), 'utf8')
		).trim();

		if (lastMigrationInBackup !== lastExecutedMigration.name) {
			throw new ApplicationError('Last Migrations Differ, make sure to use the same n8n version');
		}

		// (2. if clean truncate)
		// (2. if no clean, check if tables are empty)
		// 3. disable foreign keys

		// 4. import each jsonl
		const tables = connection.entityMetadatas
			.filter((v) => !excludeList.includes(v.tableName))
			.map((v) => ({ name: v.tableName, target: v.target }));

		for (const { name, target } of tables) {
			const repo = connection.getRepository(target);
			await repo.delete({});

			const filePath = join(backupPath, `${name}.jsonl`);
			if (!fs.existsSync(filePath)) continue;

			const fileStream = fs.createReadStream(filePath);
			const lineStream = readline.createInterface({
				input: fileStream,
			});

			for await (const line of lineStream) {
				// TODO: insert in batches to reduce DB load
				await repo.insert(JSON.parse(line));
			}

			fileStream.close();
		}

		// 5. enable foreign keys
	}

	async catch(error: Error) {
		console.log(error.stack);
		this.logger.error('Error exporting workflows. See log messages for details.');
		this.logger.error(error.message);
	}
}
