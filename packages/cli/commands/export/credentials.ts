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

export class ExportCredentialsCommand extends Command {
	static description = 'Export credentials';

	static examples = [
		`$ n8n export:credentials --all`,
		`$ n8n export:credentials --id=5 --output=file.txt`,
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
			description: 'Output file name',
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

		try {
			await Db.init();

			const findQuery: IDataObject = {};
			if (flags.id) {
				findQuery.id = flags.id;
			}

			const credentials = await Db.collections.Credentials!.find(findQuery);
			const fileContents = stringify(credentials);

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
