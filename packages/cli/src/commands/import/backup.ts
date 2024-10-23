import { Flags } from '@oclif/core';
import { tmpdir } from 'node:os';
import Container from 'typedi';

import { BaseCommand } from '../base-command';

export class ImportBackupCommand extends BaseCommand {
	static description = 'Import from a backup zip file';

	static examples = ['$ n8n import:backup', '$ n8n import:backup --input=backup.zip'];

	// TODO: add `clean` flag, or add a prompt to confirm DB truncation
	static flags = {
		input: Flags.string({
			char: 'o',
			description: 'Directory to load the archive file from',
			default: tmpdir(),
		}),
	};

	async run() {
		const { DatabaseImportService } = await import(
			'@/databases/import-export/database-import.service'
		);
		await Container.get(DatabaseImportService).import();
	}

	async catch(error: Error) {
		this.logger.error(error.message);
	}
}
