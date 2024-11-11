import { Flags } from '@oclif/core';
import { ensureError } from 'n8n-workflow';
import fs from 'node:fs';
import colors from 'picocolors';
import Container from 'typedi';

import * as Db from '@/db';

import { BaseCommand } from '../base-command';

export class ImportBackupCommand extends BaseCommand {
	static description = 'Import from a backup zip file';

	static examples = [
		'$ n8n import:backup --input=backup.zip',
		'$ n8n import:backup --input=backup.zip --delete-existing-data',
	];

	static flags = {
		input: Flags.string({
			char: 'i',
			description: 'Path to the backup archive file',
		}),
		'delete-existing-data': Flags.boolean({
			description: 'Delete all existing data in the database',
		}),
	};

	async init() {
		this.logger.warn('Import/Export functionality is currently very experimental.');
		this.logger.warn(colors.bold(colors.red('Please do not use this in production')));
		await Db.init().catch(
			async (error: Error) => await this.exitWithCrash('There was an error initializing DB', error),
		);

		await Db.migrate().catch(
			async (error: Error) =>
				await this.exitWithCrash('There was an error running database migrations', error),
		);
	}

	async run() {
		const {
			flags: { input, 'delete-existing-data': deleteExistingData },
		} = await this.parse(ImportBackupCommand);

		if (!input || !fs.existsSync(input) || !fs.lstatSync(input).isFile()) {
			this.logger.error(colors.red('A valid backup file must be provided via --input'));
			this.exit(1);
		}

		const { DatabaseImportService } = await import(
			'@/databases/import-export/database-import.service'
		);
		const databaseImportService = Container.get(DatabaseImportService);
		databaseImportService.setConfig({ input, deleteExistingData });
		try {
			await databaseImportService.import();
		} catch (error) {
			this.logger.error('[ImportService] Import failed - changes rolled back');
			this.logger.error(colors.red(ensureError(error).message));
			this.exit(1);
		}
	}

	async catch(error: Error) {
		if ('oclif' in error) return;
		this.logger.error(error.message);
	}
}
