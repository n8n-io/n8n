import {
	Command, flags,
} from '@oclif/command';

import {
	IDataObject
} from 'n8n-workflow';

import {
	Db,
} from "../../src";

import { 
	getInstance,
} from '../../src/Logger';

import {
	LoggerProxy,
} from 'n8n-workflow';

export class UpdateWorkflowCommand extends Command {
	static description = '\Update workflows';

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

	async run() {
		const logger = getInstance();
		LoggerProxy.init(logger);

		const { flags } = this.parse(UpdateWorkflowCommand);

		if (!flags.all && !flags.id) {
			logger.info(`Either option "--all" or "--id" have to be set!`);
			return;
		}

		if (flags.all && flags.id) {
			logger.info(`Either something else on top should be "--all" or "--id" can be set never both!`);
			return;
		}

		const updateQuery: IDataObject = {};
		if (flags.active === undefined) {
			logger.info(`No update flag like "--active=true" has been set!`);
			return;
		} else {
			if (!['false', 'true'].includes(flags.active)) {
				logger.info(`Valid values for flag "--active" are only "false" or "true"!`);
				return;
			}
			updateQuery.active = flags.active === 'true';
		}

		try {
			await Db.init();

			const findQuery: IDataObject = {};
			if (flags.id) {
				logger.info(`Deactivating workflow with ID: ${flags.id}`);
				findQuery.id = flags.id;
			} else {
				logger.info('Deactivating all workflows');
				findQuery.active = true;
			}

			await Db.collections.Workflow!.update(findQuery, updateQuery);
			logger.info('Done');
		} catch (e) {
			logger.error('\nGOT ERROR');
			logger.info('====================================');
			logger.error(e.message);
			logger.error(e.stack);
			this.exit(1);
		}

		this.exit();
	}
}
