/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
import { Command, flags } from '@oclif/command';

import { IDataObject, LoggerProxy } from 'n8n-workflow';

import { Db } from '../../src';

import { getLogger } from '../../src/Logger';

export class UpdateWorkflowCommand extends Command {
	static description = 'Update workflows';

	static examples = [
		`$ n8n update:workflow --all --active=false`,
		`$ n8n update:workflow --id=5 --active=true`,
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		active: flags.string({
			description: 'Active state the workflow/s should be set to',
		}),
		all: flags.boolean({
			description: 'Operate on all workflows',
		}),
		id: flags.string({
			description: 'The ID of the workflow to operate on',
		}),
	};

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);

		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(UpdateWorkflowCommand);

		if (!flags.all && !flags.id) {
			console.info(`Either option "--all" or "--id" have to be set!`);
			return;
		}

		if (flags.all && flags.id) {
			console.info(
				`Either something else on top should be "--all" or "--id" can be set never both!`,
			);
			return;
		}

		const updateQuery: IDataObject = {};
		if (flags.active === undefined) {
			console.info(`No update flag like "--active=true" has been set!`);
			return;
		}
		if (!['false', 'true'].includes(flags.active)) {
			console.info(`Valid values for flag "--active" are only "false" or "true"!`);
			return;
		}
		updateQuery.active = flags.active === 'true';

		try {
			await Db.init();

			const findQuery: IDataObject = {};
			if (flags.id) {
				console.info(`Deactivating workflow with ID: ${flags.id}`);
				findQuery.id = flags.id;
			} else {
				console.info('Deactivating all workflows');
				findQuery.active = true;
			}

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			await Db.collections.Workflow!.update(findQuery, updateQuery);
			console.info('Done');
		} catch (e) {
			console.error('Error updating database. See log messages for details.');
			logger.error('\nGOT ERROR');
			logger.info('====================================');
			logger.error(e.message);
			logger.error(e.stack);
			this.exit(1);
		}

		this.exit();
	}
}
