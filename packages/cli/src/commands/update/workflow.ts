import { Container } from 'typedi';
import { Flags } from '@oclif/core';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { BaseCommand } from '../BaseCommand';

export class UpdateWorkflowCommand extends BaseCommand {
	static description = 'Update workflows';

	static examples = [
		'$ n8n update:workflow --all --active=false',
		'$ n8n update:workflow --id=5 --active=true',
	];

	static flags = {
		help: Flags.help({ char: 'h' }),
		active: Flags.string({
			description: 'Active state the workflow/s should be set to',
		}),
		all: Flags.boolean({
			description: 'Operate on all workflows',
		}),
		id: Flags.string({
			description: 'The ID of the workflow to operate on',
		}),
	};

	async run() {
		const { flags } = await this.parse(UpdateWorkflowCommand);

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
