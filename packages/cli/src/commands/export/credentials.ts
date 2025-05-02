import { Container } from '@n8n/di';
import { Flags } from '@oclif/core';
import fs from 'fs';
import { Credentials } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import path from 'path';

import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import type { ICredentialsDecryptedDb } from '@/interfaces';
import type { ICredentialsDb } from '@/types-db';

import { BaseCommand } from '../base-command';

export class ExportCredentialsCommand extends BaseCommand {
	static description = 'Export credentials';

	static examples = [
		'$ n8n export:credentials --all',
		'$ n8n export:credentials --id=5 --output=file.json',
		'$ n8n export:credentials --all --output=backups/latest.json',
		'$ n8n export:credentials --backup --output=backups/latest/',
		'$ n8n export:credentials --all --decrypted --output=backups/decrypted.json',
	];

	static flags = {
		help: Flags.help({ char: 'h' }),
		all: Flags.boolean({
			description: 'Export all credentials',
		}),
		backup: Flags.boolean({
			description:
				'Sets --all --pretty --separate for simple backups. Only --output has to be set additionally.',
		}),
		id: Flags.string({
			description: 'The ID of the credential to export',
		}),
		output: Flags.string({
			char: 'o',
			description: 'Output file name or directory if using separate files',
		}),
		pretty: Flags.boolean({
			description: 'Format the output in an easier to read fashion',
		}),
		separate: Flags.boolean({
			description:
				'Exports one file per credential (useful for versioning). Must inform a directory via --output.',
		}),
		decrypted: Flags.boolean({
			description:
				'Exports data decrypted / in plain text. ALL SENSITIVE INFORMATION WILL BE VISIBLE IN THE FILES. Use to migrate from a installation to another that have a different secret key (in the config file).',
		}),
	};

	// eslint-disable-next-line complexity
	async run() {
		const { flags } = await this.parse(ExportCredentialsCommand);

		if (flags.backup) {
			flags.all = true;
			flags.pretty = true;
			flags.separate = true;
		}

		if (!flags.all && !flags.id) {
			this.logger.info('Either option "--all" or "--id" have to be set!');
			return;
		}

		if (flags.all && flags.id) {
			this.logger.info('You should either use "--all" or "--id" but never both!');
			return;
		}

		if (flags.separate) {
			try {
				if (!flags.output) {
					this.logger.info(
						'You must inform an output directory via --output when using --separate',
					);
					return;
				}

				if (fs.existsSync(flags.output)) {
					if (!fs.lstatSync(flags.output).isDirectory()) {
						this.logger.info('The parameter --output must be a directory');
						return;
					}
				} else {
					fs.mkdirSync(flags.output, { recursive: true });
				}
			} catch (e) {
				this.logger.error(
					'Aborting execution as a filesystem error has been encountered while creating the output directory. See log messages for details.',
				);
				this.logger.error('\nFILESYSTEM ERROR');
				if (e instanceof Error) {
					this.logger.info('====================================');
					this.logger.error(e.message);
					this.logger.error(e.stack!);
				}
				return;
			}
		} else if (flags.output) {
			if (fs.existsSync(flags.output)) {
				if (fs.lstatSync(flags.output).isDirectory()) {
					this.logger.info('The parameter --output must be a writeable file');
					return;
				}
			}
		}

		const credentials: ICredentialsDb[] = await Container.get(CredentialsRepository).findBy(
			flags.id ? { id: flags.id } : {},
		);

		if (flags.decrypted) {
			for (let i = 0; i < credentials.length; i++) {
				const { name, type, data } = credentials[i];
				const id = credentials[i].id;
				const credential = new Credentials({ id, name }, type, data);
				const plainData = credential.getData();
				(credentials[i] as ICredentialsDecryptedDb).data = plainData;
			}
		}

		if (credentials.length === 0) {
			throw new UserError('No credentials found with specified filters');
		}

		if (flags.separate) {
			let fileContents: string;
			let i: number;
			for (i = 0; i < credentials.length; i++) {
				fileContents = JSON.stringify(credentials[i], null, flags.pretty ? 2 : undefined);
				const filename = `${
					(flags.output!.endsWith(path.sep) ? flags.output! : flags.output + path.sep) +
					credentials[i].id
				}.json`;
				fs.writeFileSync(filename, fileContents);
			}
			this.logger.info(`Successfully exported ${i} credentials.`);
		} else {
			const fileContents = JSON.stringify(credentials, null, flags.pretty ? 2 : undefined);
			if (flags.output) {
				fs.writeFileSync(flags.output, fileContents);
				this.logger.info(`Successfully exported ${credentials.length} credentials.`);
			} else {
				this.logger.info(fileContents);
			}
		}
	}

	async catch(error: Error) {
		this.logger.error('Error exporting credentials. See log messages for details.');
		this.logger.error(error.message);
	}
}
