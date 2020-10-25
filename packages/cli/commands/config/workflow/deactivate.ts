import {
	Command, flags,
} from '@oclif/command';

import {
	IDataObject
} from 'n8n-workflow';

import {
	Db,
	GenericHelpers,
} from "../../../src";


export class DeactivateCommand extends Command {
	static description = '\nDeactivates workflows';

	static examples = [
		`$ n8n config:workflow:deactivate --all`,
		`$ n8n config:workflow:deactivate --id=5`,
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		all: flags.boolean({
			description: 'Deactivates all workflows',
		}),
		id: flags.string({
			description: 'Deactivats the workflow with the given ID',
		}),
	};

	async run() {
		const { flags } = this.parse(DeactivateCommand);

		if (!flags.all && !flags.id) {
			GenericHelpers.logOutput(`Either option "--all" or "--id" have to be set!`);
			return;
		}

		if (flags.all && flags.id) {
			GenericHelpers.logOutput(`Either "--all" or "--id" can be set never both!`);
			return;
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

			await Db.collections.Workflow!.update(findQuery, { active: false });
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
