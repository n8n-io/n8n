/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
import { Command, flags } from '@oclif/command';

import { Credentials, UserSettings } from 'n8n-core';

import { LoggerProxy } from 'n8n-workflow';

import * as fs from 'fs';
import * as glob from 'fast-glob';
import * as path from 'path';
import { getLogger } from '../../src/Logger';
import { Db } from '../../src';

export class ImportCredentialsCommand extends Command {
	static description = 'Import credentials';

	static examples = [
		'$ n8n import:credentials --input=file.json',
		'$ n8n import:credentials --separate --input=backups/latest/',
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

	async run(): Promise<void> {
		const logger = getLogger();
		LoggerProxy.init(logger);

		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(ImportCredentialsCommand);

		if (!flags.input) {
			console.info('An input file or directory with --input must be provided');
			return;
		}

		if (flags.separate) {
			if (fs.existsSync(flags.input)) {
				if (!fs.lstatSync(flags.input).isDirectory()) {
					console.info('The argument to --input must be a directory');
					return;
				}
			}
		}

		try {
			await Db.init();

			// Make sure the settings exist
			await UserSettings.prepareUserSettings();
			let i;

			const encryptionKey = await UserSettings.getEncryptionKey();
			if (encryptionKey === undefined) {
				throw new Error('No encryption key got found to encrypt the credentials!');
			}

			if (flags.separate) {
				const files = await glob(
					`${flags.input.endsWith(path.sep) ? flags.input : flags.input + path.sep}*.json`,
				);
				for (i = 0; i < files.length; i++) {
					const credential = JSON.parse(fs.readFileSync(files[i], { encoding: 'utf8' }));

					if (typeof credential.data === 'object') {
						// plain data / decrypted input. Should be encrypted first.
						Credentials.prototype.setData.call(credential, credential.data, encryptionKey);
					}

					await Db.collections.Credentials!.save(credential);
				}
			} else {
				const credentials = JSON.parse(fs.readFileSync(flags.input, { encoding: 'utf8' }));

				if (!Array.isArray(credentials)) {
					throw new Error(
						'File does not seem to contain credentials. Make sure the credentials are contained in an array.',
					);
				}

				for (i = 0; i < credentials.length; i++) {
					if (typeof credentials[i].data === 'object') {
						// plain data / decrypted input. Should be encrypted first.
						Credentials.prototype.setData.call(credentials[i], credentials[i].data, encryptionKey);
					}
					await Db.collections.Credentials!.save(credentials[i]);
				}
			}
			console.info(`Successfully imported ${i} ${i === 1 ? 'credential.' : 'credentials.'}`);
			process.exit(0);
		} catch (error) {
			console.error('An error occurred while importing credentials. See log messages for details.');
			logger.error(error.message);
			this.exit(1);
		}
	}
}
