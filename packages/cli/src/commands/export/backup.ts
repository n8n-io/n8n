import { Flags } from '@oclif/core';
import path from 'node:path';
import colors from 'picocolors';
import Container from 'typedi';

import * as Db from '@/db';

import { BaseCommand } from '../base-command';

export class ExportBackupCommand extends BaseCommand {
	static description = 'Backup to a zip file';

	static examples = ['$ n8n export:backup', '$ n8n export:backup --output=/path/to/directory'];

	static flags = {
		output: Flags.string({
			char: 'o',
			description: 'Output file to export the backup into',
		}),
		full: Flags.boolean({
			char: 'f',
			description: 'Whether to export all data, or only the important tables',
		}),
	};

	async init() {
		this.logger.warn('Import/Export functionality is currently very experimental.');
		this.logger.warn(colors.bold(colors.red('Please do not use this in production')));
		await Db.init().catch(
			async (error: Error) => await this.exitWithCrash('There was an error initializing DB', error),
		);
	}

	async run() {
		const { flags } = await this.parse(ExportBackupCommand);
		let output = flags.output;

		if (!output) {
			const outputDir = process.cwd();
			const outputFile = `n8n-backup-${new Date().toISOString().substring(0, 10)}.tar.gz`;
			this.logger.warn(
				`No output path was provided. Exporting backup as ${colors.bold(outputFile)} in the current directory`,
			);
			output = path.join(outputDir, outputFile);
		}

		const { DatabaseExportService } = await import(
			'@/databases/import-export/database-export.service'
		);
		const databaseExportService = Container.get(DatabaseExportService);
		databaseExportService.setConfig({
			output,
			mode: flags.full ? 'full' : 'lightweight',
		});

		await databaseExportService.export();
	}

	async catch(error: Error) {
		if ('oclif' in error) return;
		this.logger.error(error.message);
	}
}
