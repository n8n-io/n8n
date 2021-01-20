import {
	Command, flags,
} from '@oclif/command';

import {
	Db,
	GenericHelpers,
	IWorkflowDb,
} from "../../src";

import { 
	parse,
} from 'flatted';

import { 
	readFileSync,
 } from 'fs';

export class ImportWorkflowsCommand extends Command {
	static description = 'Import workflows';

	static examples = [
		`$ n8n import:workflows --input=file.txt`,
	];

	static flags = {
		help: flags.help({ char: 'h' }),
        input: flags.string({
            description: 'Input file name',
        }),
	};

	async run() {
		const { flags } = this.parse(ImportWorkflowsCommand);

		if (!flags.input) {
			GenericHelpers.logOutput(`An input file with --input must be used`);
			return;
		}

		try {
			const fileContents = parse(readFileSync(flags.input!, {encoding: 'utf8'})) as IWorkflowDb[];

			await Db.init();

			for (let i = 0; i < fileContents.length; i++) {
				await Db.collections.Workflow!.save(fileContents[i]);
			}

			console.log('Data imported!');
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
