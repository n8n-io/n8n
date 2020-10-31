import {
	Command, flags,
} from '@oclif/command';

import {
	IDataObject
} from 'n8n-workflow';

import {
	Db,
	GenericHelpers,
} from "../../src";


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
		const { flags } = this.parse(UpdateWorkflowCommand);

		if (!flags.all && !flags.id) {
			GenericHelpers.logOutput(`Either option "--all" or "--id" have to be set!`);
			return;
		}

		if (flags.all && flags.id) {
			GenericHelpers.logOutput(`Either something else on top should be "--all" or "--id" can be set never both!`);
			return;
		}

		const updateQuery: IDataObject = {};
		if (flags.active === undefined) {
			GenericHelpers.logOutput(`No update flag like "--active=true" has been set!`);
			return;
		} else {
			if (!['false', 'true'].includes(flags.active)) {
				GenericHelpers.logOutput(`Valid values for flag "--active" are only "false" or "true"!`);
				return;
			}
			updateQuery.active = flags.active === 'true';
		}

		try {
			await Db.init();

			const findQuery: IDataObject = {};
			if (flags.id) {
				console.log(`Deactivating workflow with ID: ${flags.id}`);
				findQuery.id = flags.id;
			} else {
				console.log('Deactivating all workflows');
				findQuery.active = true;
			}

			await Db.collections.Workflow!.update(findQuery, updateQuery);
			console.log('Done');
		} catch (e) {
			console.error('\nGOT ERROR');
			console.log('====================================');
			console.error(e.message);
			console.error(e.stack);
			this.exit(1);
		}

		this.exit();
	}
}
