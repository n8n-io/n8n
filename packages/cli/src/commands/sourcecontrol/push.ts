import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

import { isSourceControlLicensed } from '@/modules/source-control.ee/source-control-helper.ee';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';
import { OwnershipService } from '@/services/ownership.service';

const flagsSchema = z.object({
	message: z.string().alias('m').describe('Commit message').default('Update from CLI'),
	force: z.boolean().describe('Force push, ignoring conflicts').default(false),
});

@Command({
	name: 'sourcecontrol:push',
	description: 'Push workflows and credentials to the connected git repository',
	examples: ['--message="Deploy production"', '-m "Update workflows" --force'],
	flagsSchema,
})
export class SourceControlPushCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
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

		if (preferencesService.isBranchReadOnly()) {
			this.logger.error('Cannot push to a read-only branch');
			return;
		}

		const owner = await Container.get(OwnershipService).getInstanceOwner();
		const sourceControlService = Container.get(SourceControlService);

		this.logger.info('Pushing to source control...');

		const result = await sourceControlService.pushWorkfolder(owner, {
			commitMessage: this.flags.message,
			force: this.flags.force,
			fileNames: [],
		});

		if (result.statusCode === 409) {
			this.logger.warn('Conflicts detected. Use --force to override.');
			return;
		}

		this.logger.info(`Push completed successfully. ${result.statusResult.length} files pushed.`);

		if (result.pushResult?.update?.hash?.to) {
			this.logger.info(`Commit: ${result.pushResult.update.hash.to}`);
		}
	}

	async catch(error: Error) {
		this.logger.error('Error pushing to source control');
		this.logger.error(error.message);
	}
}
