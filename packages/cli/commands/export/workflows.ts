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

import { stringify } from 'flatted';

import {writeFile} from 'fs';

export class ExportWorkflowsCommand extends Command {
	static description = 'Export workflows';

	static examples = [
		`$ n8n export:workflows --all`,
		`$ n8n export:workflows --id=5`,
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		all: flags.boolean({
			description: 'Operate on all workflows',
		}),
		id: flags.string({
			description: 'The ID of the workflow to operate on',
        }),
        output: flags.string({
            description: 'Output file name',
        }),
	};

	async run() {
		const { flags } = this.parse(ExportWorkflowsCommand);

		if (!flags.all && !flags.id) {
			GenericHelpers.logOutput(`Either option "--all" or "--id" have to be set!`);
			return;
		}

		if (flags.all && flags.id) {
			GenericHelpers.logOutput(`Either something else on top should be "--all" or "--id" can be set never both!`);
			return;
		}

		try {
			await Db.init();

			const findQuery: IDataObject = {};
			if (flags.id) {
				findQuery.id = flags.id;
			}

            const workflows = await Db.collections.Workflow!.find(findQuery);
            const fileContents = stringify(workflows);
            
            if (flags.output) {
                await new Promise((resolve, reject) => {
                    writeFile(flags.output!, fileContents, (err) => {
                        if (err) { 
                            console.error('Failed writing file.');
                            reject(err);
                            return;
                        }
                        console.log("Data exported");
                        resolve(true);
                    });
                });
            } else {
                console.log(fileContents);
            }

			
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
