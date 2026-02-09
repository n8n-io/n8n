import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

import { isSourceControlLicensed } from '@/modules/source-control.ee/source-control-helper.ee';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';
import type { SourceControlledFile } from '@n8n/api-types';

import { SourceControlGetStatus } from '@/modules/source-control.ee/types/source-control-get-status';
import { OwnershipService } from '@/services/ownership.service';

const directionSchema = z.enum(['push', 'pull']);

const flagsSchema = z.object({
	direction: directionSchema.describe('Direction to check status for').default('push'),
	verbose: z.boolean().describe('Show detailed file list').default(false),
});

@Command({
	name: 'sourcecontrol:status',
	description: 'Show source control status',
	examples: ['', '--direction=pull', '--verbose'],
	flagsSchema,
})
export class SourceControlStatusCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
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

		// Always request non-verbose mode from the service (verbose flag controls CLI output formatting)
		const statusResult = await sourceControlService.getStatus(
			owner,
			new SourceControlGetStatus({
				direction: this.flags.direction,
				verbose: false,
				preferLocalVersion: this.flags.direction === 'push',
			}),
		);

		// getStatus with verbose=false always returns an array
		const result: SourceControlledFile[] = Array.isArray(statusResult) ? statusResult : [];

		const preferences = preferencesService.getPreferences();
		this.logger.info(`Repository: ${preferences.repositoryUrl}`);
		this.logger.info(`Branch: ${preferences.branchName}`);
		this.logger.info(`Direction: ${this.flags.direction}`);
		this.logger.info(`Total changed files: ${result.length}`);

		if (result.length === 0) {
			this.logger.info('Everything is up to date.');
			return;
		}

		if (this.flags.verbose) {
			for (const file of result) {
				const conflict = file.conflict ? ' [CONFLICT]' : '';
				this.logger.info(`  [${file.status}] ${file.type}: ${file.name ?? file.id}${conflict}`);
			}
		} else {
			const grouped: Record<string, number> = {};
			for (const file of result) {
				grouped[file.status] = (grouped[file.status] ?? 0) + 1;
			}
			for (const [status, count] of Object.entries(grouped)) {
				this.logger.info(`  ${status}: ${count}`);
			}
		}
	}

	async catch(error: Error) {
		this.logger.error('Error checking source control status');
		this.logger.error(error.message);
	}
}
