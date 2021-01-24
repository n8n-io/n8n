import {
	Command,
	flags,
} from '@oclif/command';

import {
	Db,
	GenericHelpers,
} from '../../src';

import * as fs from 'fs';
import * as glob from 'glob-promise';
import * as path from 'path';

export class ImportWorkflowsCommand extends Command {
	static description = 'Import workflows';

	static examples = [
		`$ n8n import:workflow --input=file.json`,
		`$ n8n import:workflow --separate --input=backups/latest/`,
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		input: flags.string({
			char: 'i',
			description: 'Input file name or directory if --separate is used',
		}),
		separate: flags.boolean({
			description: 'Imports *.json files from directory provided by --input',
		}),
	};

	async run() {
		const { flags } = this.parse(ImportWorkflowsCommand);

		if (!flags.input) {
			GenericHelpers.logOutput(`An input file or directory with --input must be provided`);
			return;
		}

		if (flags.separate) {
			if (fs.existsSync(flags.input)) {
				if (!fs.lstatSync(flags.input).isDirectory()) {
					GenericHelpers.logOutput(`The paramenter --input must be a directory`);
					return;
				}
			}
		}

		try {
			await Db.init();
			let i;
			if (flags.separate) {
				const files = await glob((flags.input.endsWith(path.sep) ? flags.input : flags.input + path.sep) + '*.json');
				for (i = 0; i < files.length; i++) {
					const workflow = JSON.parse(fs.readFileSync(files[i], { encoding: 'utf8' }));
					await Db.collections.Workflow!.save(workflow);
				}
			} else {
				const fileContents = JSON.parse(fs.readFileSync(flags.input, { encoding: 'utf8' }));

				if (!Array.isArray(fileContents)) {
					throw new Error(`File does not seem to contain workflows.`);
				}

				for (i = 0; i < fileContents.length; i++) {
					await Db.collections.Workflow!.save(fileContents[i]);
				}
			}

			console.log('Successfully imported', i, i === 1 ? 'workflow.' : 'workflows.');
		} catch (error) {
			this.error(error.message);
			this.exit(1);
		}
	}
}
