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

export class ExportCredentialsCommand extends Command {
	static description = 'Export credentials';

	static examples = [
		`$ n8n export:credentials --all`,
		`$ n8n export:credentials --id=5 --output=file.json`,
		`$ n8n export:credentials --all --output=backups/latest/`,
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		all: flags.boolean({
			description: 'Export all credentials',
		}),
		id: flags.string({
			description: 'The ID of the credential to export',
		}),
		output: flags.string({
			description: 'Output file name or directory if using separate files',
		}),
		pretty: flags.boolean({
			description: 'Format the output in an easier to read fashion',
		}),
		separate: flags.boolean({
			description: 'Exports one file per credential (useful for versioning). Must inform a directory via --output.',
		}),
	};

	async run() {
		const { flags } = this.parse(ExportCredentialsCommand);

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

			const credentials = await Db.collections.Credentials!.find(findQuery);

			if (credentials.length === 0) {
				throw new Error('No credentials found with specified filters.');
			}

			if (flags.separate) {
				let fileContents: string, i: number;
				for (i = 0; i < credentials.length; i++) {
					fileContents = JSON.stringify(credentials[i], null, flags.pretty ? 2 : undefined);
					const filename = (flags.output!.endsWith(path.sep) ? flags.output! : flags.output + path.sep) + credentials[i].id + ".json";
					fs.writeFileSync(filename, fileContents);
				}
				console.log('Successfully exported', i, 'credentials.');
			} else {
				const fileContents = JSON.stringify(credentials, null, flags.pretty ? 2 : undefined);
				if (flags.output) {
					fs.writeFileSync(flags.output!, fileContents);
					console.log('Successfully exported', credentials.length, 'credentials.');
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
