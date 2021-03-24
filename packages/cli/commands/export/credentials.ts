import {
	Command,
	flags,
} from '@oclif/command';

import {
	Credentials,
	UserSettings,
} from 'n8n-core';

import {
	IDataObject
} from 'n8n-workflow';

import {
	Db,
	GenericHelpers,
	ICredentialsDecryptedDb,
} from '../../src';

import * as fs from 'fs';
import * as path from 'path';

export class ExportCredentialsCommand extends Command {
	static description = 'Export credentials';

	static examples = [
		`$ n8n export:credentials --all`,
		`$ n8n export:credentials --id=5 --output=file.json`,
		`$ n8n export:credentials --all --output=backups/latest.json`,
		`$ n8n export:credentials --backup --output=backups/latest/`,
		`$ n8n export:credentials --all --decrypted --output=backups/decrypted.json`,
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		all: flags.boolean({
			description: 'Export all credentials',
		}),
		backup: flags.boolean({
			description: 'Sets --all --pretty --separate for simple backups. Only --output has to be set additionally.',
		}),
		id: flags.string({
			description: 'The ID of the credential to export',
		}),
		output: flags.string({
			char: 'o',
			description: 'Output file name or directory if using separate files',
		}),
		pretty: flags.boolean({
			description: 'Format the output in an easier to read fashion',
		}),
		separate: flags.boolean({
			description: 'Exports one file per credential (useful for versioning). Must inform a directory via --output.',
		}),
		decrypted: flags.boolean({
			description: 'Exports data decrypted / in plain text. ALL SENSITIVE INFORMATION WILL BE VISIBLE IN THE FILES. Use to migrate from a installation to another that have a different secret key (in the config file).',
		}),
	};

	async run() {
		const { flags } = this.parse(ExportCredentialsCommand);

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

			const credentials = await Db.collections.Credentials!.find(findQuery);

			if (flags.decrypted) {
				const encryptionKey = await UserSettings.getEncryptionKey();
				if (encryptionKey === undefined) {
					throw new Error('No encryption key got found to decrypt the credentials!');
				}

				for (let i = 0; i < credentials.length; i++) {
					const { name, type, nodesAccess, data } = credentials[i];
					const credential = new Credentials(name, type, nodesAccess, data);
					const plainData = credential.getData(encryptionKey);
					(credentials[i] as ICredentialsDecryptedDb).data = plainData;
				}
			}

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
