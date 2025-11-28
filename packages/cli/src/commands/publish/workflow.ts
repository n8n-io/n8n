import { WorkflowRepository } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

const flagsSchema = z.object({
	id: z.string().describe('The ID of the workflow to publish'),
	versionId: z
		.string()
		.describe('The version ID to publish. If not provided, publishes the current version')
		.optional(),
	all: z.boolean().describe('(Deprecated) This flag is no longer supported').optional(),
});

@Command({
	name: 'publish:workflow',
	description:
		'Publish a specific version of a workflow. If no version is specified, publishes the current version.',
	examples: ['--id=5 --versionId=abc123', '--id=5'],
	flagsSchema,
})
export class PublishWorkflowCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const { flags } = this;

		// Educate users who try to use --all flag
		if (flags.all) {
			this.logger.error('The --all flag is no longer supported for workflow publishing.');
			this.logger.error(
				'Please publish workflows individually using: publish:workflow --id=<workflow-id> [--versionId=<version-id>]',
			);
			return;
		}

		if (flags.versionId) {
			this.logger.info(`Publishing workflow with ID: ${flags.id}, version: ${flags.versionId}`);
		} else {
			this.logger.info(`Publishing workflow with ID: ${flags.id} (current version)`);
		}

		await Container.get(WorkflowRepository).publishVersion(flags.id, flags.versionId);

		this.logger.info('Note: Changes will not take effect if n8n is running.');
		this.logger.info('Please restart n8n for changes to take effect if n8n is currently running.');
	}

	async catch(error: Error) {
		this.logger.error('Error updating database. See log messages for details.');
		this.logger.error('\nGOT ERROR');
		this.logger.error('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack!);
	}
}
