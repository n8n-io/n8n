/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
import { Command, flags } from '@oclif/command';

import { Credentials, UserSettings } from 'n8n-core';

import { IDataObject, LoggerProxy } from 'n8n-workflow';

import fs from 'fs';
import path from 'path';
import { getLogger } from '../../src/Logger';
import { Db, ICredentialsDecryptedDb } from '../../src';

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
			description:
				'Sets --all --pretty --separate for simple backups. Only --output has to be set additionally.',
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
			description:
				'Exports one file per credential (useful for versioning). Must inform a directory via --output.',
		}),
		decrypted: flags.boolean({
			description:
				'Exports data decrypted / in plain text. ALL SENSITIVE INFORMATION WILL BE VISIBLE IN THE FILES. Use to migrate from a installation to another that have a different secret key (in the config file).',
		}),
	};

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);

		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(ExportCredentialsCommand);

		if (flags.backup) {
			flags.all = true;
			flags.pretty = true;
			flags.separate = true;
		}

		if (!flags.all && !flags.id) {
			console.info(`Either option "--all" or "--id" have to be set!`);
			return;
		}

		if (flags.all && flags.id) {
			console.info(`You should either use "--all" or "--id" but never both!`);
			return;
		}

		if (flags.separate) {
			try {
				if (!flags.output) {
					console.info(`You must inform an output directory via --output when using --separate`);
					return;
				}

				if (fs.existsSync(flags.output)) {
					if (!fs.lstatSync(flags.output).isDirectory()) {
						console.info(`The parameter --output must be a directory`);
						return;
					}
				} else {
					fs.mkdirSync(flags.output, { recursive: true });
				}
			} catch (e) {
				console.error(
					'Aborting execution as a filesystem error has been encountered while creating the output directory. See log messages for details.',
				);
				logger.error('\nFILESYSTEM ERROR');
				logger.info('====================================');
				logger.error(e.message);
				logger.error(e.stack);
				this.exit(1);
			}
		} else if (flags.output) {
			if (fs.existsSync(flags.output)) {
				if (fs.lstatSync(flags.output).isDirectory()) {
					console.info(`The parameter --output must be a writeable file`);
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

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const credentials = await Db.collections.Credentials.find(findQuery);

			if (flags.decrypted) {
				const encryptionKey = await UserSettings.getEncryptionKey();

				for (let i = 0; i < credentials.length; i++) {
					const { name, type, nodesAccess, data } = credentials[i];
					const id = credentials[i].id as string;
					const credential = new Credentials({ id, name }, type, nodesAccess, data);
					const plainData = credential.getData(encryptionKey);
					(credentials[i] as ICredentialsDecryptedDb).data = plainData;
				}
			}

			if (credentials.length === 0) {
				throw new Error('No credentials found with specified filters.');
			}

			if (flags.separate) {
				let fileContents: string;
				let i: number;
				for (i = 0; i < credentials.length; i++) {
					fileContents = JSON.stringify(credentials[i], null, flags.pretty ? 2 : undefined);
					const filename = `${
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						(flags.output!.endsWith(path.sep) ? flags.output! : flags.output + path.sep) +
						credentials[i].id
					}.json`;
					fs.writeFileSync(filename, fileContents);
				}
				console.info(`Successfully exported ${i} credentials.`);
			} else {
				const fileContents = JSON.stringify(credentials, null, flags.pretty ? 2 : undefined);
				if (flags.output) {
					fs.writeFileSync(flags.output, fileContents);
					console.info(`Successfully exported ${credentials.length} credentials.`);
				} else {
					console.info(fileContents);
				}
			}
			// Force exit as process won't exit using MySQL or Postgres.
			process.exit(0);
		} catch (error) {
			console.error('Error exporting credentials. See log messages for details.');
			logger.error(error.message);
			this.exit(1);
		}
	}
}
