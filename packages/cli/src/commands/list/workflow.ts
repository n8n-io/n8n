import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Flags } from '@oclif/core';

import { BaseCommand } from '../base-command';

export class ListWorkflowCommand extends BaseCommand {
	static description = '\nList workflows';

	static examples = [
		'$ n8n list:workflow',
		'$ n8n list:workflow --active=true --onlyId',
		'$ n8n list:workflow --active=false',
	];

	static flags = {
		help: Flags.help({ char: 'h' }),
		active: Flags.string({
			description: 'Filters workflows by active status. Can be true or false',
		}),
		onlyId: Flags.boolean({
			description: 'Outputs workflow IDs only, one per line.',
		}),
	};

	async run() {
		const { flags } = await this.parse(ListWorkflowCommand);

		if (flags.active !== undefined && !['true', 'false'].includes(flags.active)) {
			this.error('The --active flag has to be passed using true or false');
		}

		const workflowRepository = Container.get(WorkflowRepository);

		const workflows =
			flags.active !== undefined
				? await workflowRepository.findByActiveState(flags.active === 'true')
				: await workflowRepository.find();

		if (flags.onlyId) {
			workflows.forEach((workflow) => this.logger.info(workflow.id));
		} else {
			workflows.forEach((workflow) => this.logger.info(`${workflow.id}|${workflow.name}`));
		}
	}

	async catch(error: Error) {
		this.logger.error('\nGOT ERROR');
		this.logger.error('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack!);
	}
}
