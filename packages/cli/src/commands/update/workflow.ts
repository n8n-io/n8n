import { WorkflowRepository } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

const flagsSchema = z.object({
	active: z.string().describe('Active state the workflow/s should be set to').optional(),
	all: z.boolean().describe('Operate on all workflows').optional(),
	id: z.string().describe('The ID of the workflow to operate on').optional(),
});

@Command({
	name: 'update:workflow',
	description: 'Update workflows',
	examples: ['--all --active=false', '--id=5 --active=true'],
	flagsSchema,
})
export class UpdateWorkflowCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const { flags } = this;

		if (!flags.all && !flags.id) {
			this.logger.error('Either option "--all" or "--id" have to be set!');
			return;
		}

		if (flags.all && flags.id) {
			this.logger.error(
				'Either something else on top should be "--all" or "--id" can be set never both!',
			);
			return;
		}

		if (flags.active === undefined) {
			this.logger.error('No update flag like "--active=true" has been set!');
			return;
		}

		if (!['false', 'true'].includes(flags.active)) {
			this.logger.error('Valid values for flag "--active" are only "false" or "true"!');
			return;
		}

		const newState = flags.active === 'true';
		const action = newState ? 'Activating' : 'Deactivating';

		if (flags.id) {
			this.logger.info(`${action} workflow with ID: ${flags.id}`);
			await Container.get(WorkflowRepository).updateActiveState(flags.id, newState);
		} else {
			this.logger.info(`${action} all workflows`);
			if (newState) {
				await Container.get(WorkflowRepository).activateAll();
			} else {
				await Container.get(WorkflowRepository).deactivateAll();
			}
		}

		this.logger.info('Activation or deactivation will not take effect if n8n is running.');
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
