import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '../base-command';
import { CliWorkflowPublisher, isExpectedFailure } from '../cli-workflow-publisher';

const flagsSchema = z.object({
	active: z.string().describe('Active state the workflow/s should be set to').optional(),
	all: z.boolean().describe('Operate on all workflows').optional(),
	id: z.string().describe('The ID of the workflow to operate on').optional(),
});

@Command({
	name: 'update:workflow',
	description: '[DEPRECATED] Update workflows - use publish:workflow or unpublish:workflow instead',
	examples: ['--all --active=false', '--id=5 --active=true'],
	flagsSchema,
})
export class UpdateWorkflowCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	// Publishing and unpublishing evaluate webhook parameters, which may be expressions
	override needsExpressionEngine = true;

	async init() {
		await super.init();
		await this.initLicense();
		await this.initPolicyEnforcement();
		await this.initExternalHooks();
	}

	async run() {
		const cliWorkflowPublisher = Container.get(CliWorkflowPublisher);
		const { flags } = this;

		this.logger.warn('⚠️  WARNING: The "update:workflow" command is deprecated.\n');

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

		// Backwards compatibility: if --id and --active=true, publish the current version
		if (flags.id && newState) {
			this.logger.info(`Publishing workflow ${flags.id} with current version`);
			this.logger.warn(`Please use: publish:workflow --id=${flags.id}\n`);
			await cliWorkflowPublisher.publish(flags.id);

			this.logger.info(cliWorkflowPublisher.whenChangeApplies());
			return;
		}

		// Block publishing with --all flag
		if (flags.all && newState) {
			this.logger.error('Workflow publishing via "update:workflow --all" is no longer supported.');
			this.logger.error(
				'Please publish workflows individually using: publish:workflow --id=<workflow-id>',
			);
			return;
		}

		// Show appropriate replacement command suggestion for unpublishing
		if (flags.id) {
			this.logger.warn(`Please use: unpublish:workflow --id=${flags.id}\n`);
		} else {
			this.logger.warn('Please use: unpublish:workflow --all\n');
		}

		if (flags.id) {
			this.logger.info(`${action} workflow with ID: ${flags.id}`);
			await cliWorkflowPublisher.unpublish(flags.id);
		} else {
			this.logger.info(`${action} all workflows`);
			await cliWorkflowPublisher.unpublishAll();
		}

		this.logger.info(cliWorkflowPublisher.whenChangeApplies());
	}

	async catch(error: Error) {
		if (!isExpectedFailure(error)) {
			this.logError(error, 'Error updating workflow(s). See log messages for details.');
		}
	}
}
