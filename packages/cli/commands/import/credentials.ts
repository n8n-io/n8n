import {
	Command,
	flags,
} from '@oclif/command';

import {
	Credentials,
	UserSettings,
} from 'n8n-core';

import {
	Db,
} from '../../src';

import { 
	getLogger,
} from '../../src/Logger';

import {
	LoggerProxy,
} from 'n8n-workflow';

import * as fs from 'fs';
import * as glob from 'glob-promise';
import * as path from 'path';

export class ImportCredentialsCommand extends Command {
	static description = 'Import credentials';

	static examples = [
		`$ n8n import:credentials --input=file.json`,
		`$ n8n import:credentials --separate --input=backups/latest/`,
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
		const logger = getLogger();
		LoggerProxy.init(logger);

		const { flags } = this.parse(ImportCredentialsCommand);

		if (!flags.input) {
			console.info(`An input file or directory with --input must be provided`);
			return;
		}

		if (flags.separate) {
			if (fs.existsSync(flags.input)) {
				if (!fs.lstatSync(flags.input).isDirectory()) {
					console.info(`The paramenter --input must be a directory`);
					return;
				}
			}
		}

		try {
			await Db.init();
			let i;

			const encryptionKey = await UserSettings.getEncryptionKey();
			if (encryptionKey === undefined) {
				throw new Error('No encryption key got found to encrypt the credentials!');
			}

			if (flags.separate) {
				const files = await glob((flags.input.endsWith(path.sep) ? flags.input : flags.input + path.sep) + '*.json');
				for (i = 0; i < files.length; i++) {
					const credential = JSON.parse(fs.readFileSync(files[i], { encoding: 'utf8' }));

					if (typeof credential.data === 'object') {
						// plain data / decrypted input. Should be encrypted first.
						Credentials.prototype.setData.call(credential, credential.data, encryptionKey);
					}

					await Db.collections.Credentials!.save(credential);
				}
			} else {
				const fileContents = JSON.parse(fs.readFileSync(flags.input, { encoding: 'utf8' }));

				if (!Array.isArray(fileContents)) {
					throw new Error(`File does not seem to contain credentials.`);
				}

				for (i = 0; i < fileContents.length; i++) {
					if (typeof fileContents[i].data === 'object') {
						// plain data / decrypted input. Should be encrypted first.
						Credentials.prototype.setData.call(fileContents[i], fileContents[i].data, encryptionKey);
					}
					await Db.collections.Credentials!.save(fileContents[i]);
				}
			}
			console.info(`Successfully imported ${i} ${i === 1 ? 'credential.' : 'credentials.'}`);
			process.exit(0);
		} catch (error) {
			console.error('An error occurred while exporting credentials. See log messages for details.');
			logger.error(error.message);
			this.exit(1);
		}
	}
}
