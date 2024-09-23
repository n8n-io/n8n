import { Flags } from '@oclif/core';
import { tmpdir } from 'node:os';
import { join } from 'path';
import Container from 'typedi';

import { BackupService } from '@/services/backup.service';

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
		const { flags } = await this.parse(ExportBackupCommand);
		const zipPath = join(flags.output, 'n8n-backup.zip');
		const backupService = Container.get(BackupService);
		await backupService.createBackup(zipPath);
		console.log(`data exported to ${zipPath}`);
	}

	async catch(error: Error) {
		this.logger.error(error.message);
	}
}
