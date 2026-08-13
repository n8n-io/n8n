import { WorkflowRepository } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

const flagsSchema = z.object({
	all: z.boolean().describe('Unpublish all workflows').optional(),
	id: z.string().describe('The ID of the workflow to unpublish').optional(),
});

@Command({
	name: 'unpublish:workflow',
	description: 'Unpublish workflow(s)',
	examples: ['--all', '--id=5'],
	flagsSchema,
})
export class UnpublishWorkflowCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const { flags } = this;

		if (!flags.all && !flags.id) {
			this.logger.error('Either option "--all" or "--id" must be set.');
			return;
		}

		if (flags.all && flags.id) {
			this.logger.error('Cannot use both "--all" and "--id" flags together.');
			return;
		}

		if (flags.id) {
			this.logger.info(`Unpublishing workflow with ID: ${flags.id}`);
			await Container.get(WorkflowRepository).updateActiveState(flags.id, false);
			this.logger.info('Workflow unpublished successfully');
		} else {
			this.logger.info('Unpublishing all workflows');
			await Container.get(WorkflowRepository).unpublishAll();
			this.logger.info('All workflows unpublished successfully');
		}

		this.logger.info('Note: Changes will not take effect if n8n is running.');
		this.logger.info('Please restart n8n for changes to take effect if n8n is currently running.');
	}

	async catch(error: Error) {
		this.logger.error('Error unpublishing workflow(s). See log messages for details.');
		this.logger.error('\nGOT ERROR');
		this.logger.error('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack!);
	}
}
