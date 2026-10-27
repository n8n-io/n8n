import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '../base-command';
import { CliWorkflowPublisher } from '../cli-workflow-publisher';

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
	// Publishing evaluates webhook parameters, which may be expressions
	override needsExpressionEngine = true;

	async init() {
		await super.init();
		await this.initLicense();
		await this.initPolicyEnforcement();
		await this.initExternalHooks();
	}

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

		const cliWorkflowPublisher = Container.get(CliWorkflowPublisher);
		await cliWorkflowPublisher.publish(flags.id, flags.versionId);

		this.logger.info(cliWorkflowPublisher.whenChangeApplies());
	}

	async catch(error: Error) {
		this.logError(error, 'Error updating database. See log messages for details.');
	}
}
