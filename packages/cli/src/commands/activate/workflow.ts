import { WorkflowRepository } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

const flagsSchema = z.object({
	id: z.string().describe('The ID of the workflow to activate'),
	versionId: z
		.string()
		.describe('The version ID to activate. If not provided, activates the current version')
		.optional(),
	all: z.boolean().describe('(Deprecated) This flag is no longer supported').optional(),
});

@Command({
	name: 'activate:workflow',
	description:
		'Activate a specific version of a workflow. If no version is specified, activates the current version.',
	examples: ['--id=5 --versionId=abc123', '--id=5'],
	flagsSchema,
})
export class ActivateWorkflowCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const { flags } = this;

		// Educate users who try to use --all flag
		if (flags.all) {
			this.logger.error('The --all flag is no longer supported for workflow activation.');
			this.logger.error(
				'Please activate workflows individually using: activate:workflow --id=<workflow-id> [--versionId=<version-id>]',
			);
			return;
		}

		if (!flags.id) {
			this.logger.error('The --id flag is required. Please specify a workflow ID.');
			this.logger.error('Example: activate:workflow --id=5 [--versionId=abc123]');
			return;
		}

		if (flags.versionId) {
			this.logger.info(`Activating workflow with ID: ${flags.id}, version: ${flags.versionId}`);
		} else {
			this.logger.info(`Activating workflow with ID: ${flags.id} (current version)`);
		}

		try {
			await Container.get(WorkflowRepository).activateVersion(flags.id, flags.versionId);
			this.logger.info('Workflow activated successfully');
		} catch (error) {
			this.logger.error(
				'Failed to activate workflow. Please check the workflow ID and version ID.',
			);
			throw error;
		}

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
