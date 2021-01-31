import {
	Command,
	flags,
} from '@oclif/command';

import {
	IDataObject
} from 'n8n-workflow';

import {
	Db,
	GenericHelpers,
} from '../../src';

import * as fs from 'fs';
import * as path from 'path';

export class ExportWorkflowsCommand extends Command {
	static description = 'Export workflows';

	static examples = [
		`$ n8n export:workflow --all`,
		`$ n8n export:workflow --id=5 --output=file.json`,
		`$ n8n export:workflow --all --output=backups/latest/`,
		`$ n8n export:workflow --backup --output=backups/latest/`,
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		all: flags.boolean({
			description: 'Export all workflows',
		}),
		backup: flags.boolean({
			description: 'Sets --all --pretty --separate for simple backups. Only --output has to be set additionally.',
		}),
		id: flags.string({
			description: 'The ID of the workflow to export',
		}),
		output: flags.string({
			char: 'o',
			description: 'Output file name or directory if using separate files',
		}),
		pretty: flags.boolean({
			description: 'Format the output in an easier to read fashion',
		}),
		separate: flags.boolean({
			description: 'Exports one file per workflow (useful for versioning). Must inform a directory via --output.',
		}),
	};

	async run() {
		const { flags } = this.parse(ExportWorkflowsCommand);

		if (flags.backup) {
			flags.all = true;
			flags.pretty = true;
			flags.separate = true;
		}

		if (!flags.all && !flags.id) {
			GenericHelpers.logOutput(`Either option "--all" or "--id" have to be set!`);
			return;
		}

		if (flags.all && flags.id) {
			GenericHelpers.logOutput(`You should either use "--all" or "--id" but never both!`);
			return;
		}

		if (flags.separate) {
			try {
				if (!flags.output) {
					GenericHelpers.logOutput(`You must inform an output directory via --output when using --separate`);
					return;
				}

				if (fs.existsSync(flags.output)) {
					if (!fs.lstatSync(flags.output).isDirectory()) {
						GenericHelpers.logOutput(`The paramenter --output must be a directory`);
						return;
					}
				} else {
					fs.mkdirSync(flags.output, { recursive: true });
				}
			} catch (e) {
				console.error('\nFILESYSTEM ERROR');
				console.log('====================================');
				console.error(e.message);
				console.error(e.stack);
				this.exit(1);
			}
		} else if (flags.output) {
			if (fs.existsSync(flags.output)) {
				if (fs.lstatSync(flags.output).isDirectory()) {
					GenericHelpers.logOutput(`The paramenter --output must be a writeble file`);
					return;
				}
			}
		}

		try {
			await Db.init();

			const findQuery: IDataObject = {};
			if (flags.id) {
				findQuery.id = flags.id;
			}

			const workflows = await Db.collections.Workflow!.find(findQuery);

			if (workflows.length === 0) {
				throw new Error('No workflows found with specified filters.');
			}

			if (flags.separate) {
				let fileContents: string, i: number;
				for (i = 0; i < workflows.length; i++) {
					fileContents = JSON.stringify(workflows[i], null, flags.pretty ? 2 : undefined);
					const filename = (flags.output!.endsWith(path.sep) ? flags.output! : flags.output + path.sep) + workflows[i].id + ".json";
					fs.writeFileSync(filename, fileContents);
				}
				console.log('Successfully exported', i, 'workflows.');
			} else {
				const fileContents = JSON.stringify(workflows, null, flags.pretty ? 2 : undefined);
				if (flags.output) {
					fs.writeFileSync(flags.output!, fileContents);
					console.log('Successfully exported', workflows.length, workflows.length === 1 ? 'workflow.' : 'workflows.');
				} else {
					console.log(fileContents);
				}
			}
		} catch (error) {
			this.error(error.message);
			this.exit(1);
		}
	}
}
