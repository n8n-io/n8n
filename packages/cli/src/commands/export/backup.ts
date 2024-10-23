import { Flags } from '@oclif/core';
import { tmpdir } from 'node:os';
import Container from 'typedi';

import { BaseCommand } from '../base-command';

export class ExportBackupCommand extends BaseCommand {
	static description = 'Backup to a zip file';

	static examples = ['$ n8n export:backup', '$ n8n export:backup --output=backup.zip'];

	static flags = {
		output: Flags.string({
			char: 'o',
			description: 'Directory to output the archive file in',
			default: tmpdir(),
		}),
	};

	async run() {
		const { DatabaseExportService } = await import(
			'@/databases/import-export/database-export.service'
		);

		await Container.get(DatabaseExportService).export();
	}

	async catch(error: Error) {
		this.logger.error(error.message);
	}
}
