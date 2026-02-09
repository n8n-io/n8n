import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

import { isSourceControlLicensed } from '@/modules/source-control.ee/source-control-helper.ee';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';
import { OwnershipService } from '@/services/ownership.service';

const flagsSchema = z.object({
	force: z.boolean().describe('Force pull, overwriting local changes').default(false),
});

@Command({
	name: 'sourcecontrol:pull',
	description: 'Pull workflows and credentials from the connected git repository',
	examples: ['', '--force'],
	flagsSchema,
})
export class SourceControlPullCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		if (!isSourceControlLicensed()) {
			this.logger.error('Source control feature is not licensed');
			return;
		}

		const preferencesService = Container.get(SourceControlPreferencesService);
		if (!preferencesService.isSourceControlConnected()) {
			this.logger.error('Source control is not connected to a repository');
			return;
		}

		const owner = await Container.get(OwnershipService).getInstanceOwner();
		const sourceControlService = Container.get(SourceControlService);

		this.logger.info('Pulling from source control...');

		const result = await sourceControlService.pullWorkfolder(owner, {
			force: this.flags.force,
			autoPublish: 'none',
		});

		if (result.statusCode === 409) {
			this.logger.warn('Conflicts detected. Use --force to override.');
			return;
		}

		this.logger.info(`Pull completed successfully. ${result.statusResult.length} files processed.`);
	}

	async catch(error: Error) {
		this.logger.error('Error pulling from source control');
		this.logger.error(error.message);
	}
}
