import { WorkflowRepository } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

const flagsSchema = z.object({
	id: z.string().describe('The ID of the workflow to publish').optional(),
	versionId: z
		.string()
		.describe('The version ID to publish. If not provided, publishes the current version')
		.optional(),
	all: z.boolean().describe('Publish all workflows').optional(),
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

		if (flags.all) {
			await this.publishAllWorkflows();
		} else {
			await this.publishWorkflow();
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

	private async publishAllWorkflows() {
		const { flags } = this;

		if (flags.id) {
			this.logger.error('The --id flag cannot be used with the --all flag.');
			return;
		}

		if (flags.versionId) {
			this.logger.error('The --versionId flag cannot be used with the --all flag.');
			return;
		}

		this.logger.info('Publishing all workflows');

		const workflowRepository = Container.get(WorkflowRepository);

		const workflows = await workflowRepository.find();

		await Promise.all(
			workflows.map(async (workflow) => {
				await workflowRepository.publishVersion(workflow.id);
			}),
		);

		this.logger.info('All workflows published successfully');
	}

	private async publishWorkflow() {
		const { flags } = this;

		if (!flags.id) {
			this.logger.error('The --id flag is required.');
			return;
		}

		if (flags.versionId) {
			this.logger.info(`Publishing workflow with ID: ${flags.id}, version: ${flags.versionId}`);
		} else {
			this.logger.info(`Publishing workflow with ID: ${flags.id} (current version)`);
		}

		await Container.get(WorkflowRepository).publishVersion(flags.id, flags.versionId);
	}
}
