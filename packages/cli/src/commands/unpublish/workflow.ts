import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '../base-command';
import { CliWorkflowPublisher } from '../cli-workflow-publisher';

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
	// Unpublishing evaluates webhook parameters, which may be expressions
	override needsExpressionEngine = true;

	async init() {
		await super.init();
		await this.initLicense();
		await this.initPolicyEnforcement();
		await this.initExternalHooks();
	}

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

		const cliWorkflowPublisher = Container.get(CliWorkflowPublisher);
		if (flags.id) {
			this.logger.info(`Unpublishing workflow with ID: ${flags.id}`);
			await cliWorkflowPublisher.unpublish(flags.id);
			this.logger.info('Workflow unpublished successfully');
		} else {
			this.logger.info('Unpublishing all workflows');
			await cliWorkflowPublisher.unpublishAll();
			this.logger.info('All workflows unpublished successfully');
		}

		this.logger.info(cliWorkflowPublisher.whenChangeApplies());
	}

	async catch(error: Error) {
		this.logError(error, 'Error unpublishing workflow(s). See log messages for details.');
	}
}
