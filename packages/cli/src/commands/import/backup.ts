import { Flags } from '@oclif/core';
import { tmpdir } from 'node:os';
import { join } from 'path';
import Container from 'typedi';

import { BackupService } from '@/services/backup.service';

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
		const { flags } = await this.parse(ImportBackupCommand);
		const zipPath = join(flags.input, 'n8n-backup.zip');
		const backupService = Container.get(BackupService);
		await backupService.importBackup(zipPath);
		console.log(`data imported from ${zipPath}`);
	}

	async catch(error: Error) {
		this.logger.error(error.message);
	}
}
