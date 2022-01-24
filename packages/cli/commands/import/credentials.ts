/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
import { getConnection } from 'typeorm';
import { getLogger } from '../../src/Logger';
import { Db } from '../../src';
import { User } from '../../src/databases/entities/User';
import { SharedCredentials } from '../../src/databases/entities/SharedCredentials';
import { Role } from '../../src/databases/entities/Role';
import { CredentialsEntity } from '../../src/databases/entities/CredentialsEntity';

const FIX_INSTRUCTION =
	'Please fix the database by running ./packages/cli/bin/n8n user-management:reset';

export class ImportCredentialsCommand extends Command {
	static description = 'Import credentials';

	static examples = [
		'$ n8n import:credentials --input=file.json',
		'$ n8n import:credentials --separate --input=backups/latest/',
		'$ n8n import:credentials --input=file.json --id=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
		'$ n8n import:credentials --separate --input=backups/latest/ --id=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
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
		id: flags.string({
			description: 'The ID of the user to assign the imported credentials to',
		}),
	};

	ownerCredentialRole: Role;

	async run(): Promise<void> {
		const logger = getLogger();
		LoggerProxy.init(logger);

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

			await this.initOwnerCredentialRole();
			const user = flags.id ? await this.getAssignee(flags.id) : await this.getOwner();

			// Make sure the settings exist
			await UserSettings.prepareUserSettings();
			let i: number;

			const encryptionKey = await UserSettings.getEncryptionKey();
			if (encryptionKey === undefined) {
				throw new Error('No encryption key found to encrypt the credentials!');
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

					await this.storeCredential(credential, user);
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
					await this.storeCredential(credentials[i], user);
				}
			}
			console.info(`Successfully imported ${i} ${i === 1 ? 'credential.' : 'credentials.'}`);
			process.exit();
		} catch (error) {
			console.error('An error occurred while importing credentials. See log messages for details.');
			if (error instanceof Error) logger.error(error.message);
			this.exit(1);
		}
	}

	private async initOwnerCredentialRole() {
		const ownerCredentialRole = await Db.collections.Role!.findOne({
			where: { name: 'owner', scope: 'credential' },
		});

		if (!ownerCredentialRole) {
			throw new Error(`Owner credential role not found. ${FIX_INSTRUCTION}`);
		}

		this.ownerCredentialRole = ownerCredentialRole;
	}

	private async storeCredential(credential: object, user: User) {
		await getConnection().transaction(async (transactionManager) => {
			const newCredential = new CredentialsEntity();

			Object.assign(newCredential, credential);

			const savedCredential = await transactionManager.save<CredentialsEntity>(newCredential);

			const newSharedCredential = new SharedCredentials();

			Object.assign(newSharedCredential, {
				credentials: savedCredential,
				user,
				role: this.ownerCredentialRole,
			});

			await transactionManager.save<SharedCredentials>(newSharedCredential);
		});
	}

	private async getOwner() {
		const ownerGlobalRole = await Db.collections.Role!.findOne({
			where: { name: 'owner', scope: 'global' },
		});

		const owner = await Db.collections.User!.findOne({ globalRole: ownerGlobalRole });

		if (!owner) {
			throw new Error(`No owner found. ${FIX_INSTRUCTION}`);
		}

		return owner;
	}

	private async getAssignee(id: string) {
		const user = await Db.collections.User!.findOne(id);

		if (!user) {
			throw new Error(`Failed to find user with ID ${id}. Are you sure this user exists?`);
		}

		return user;
	}
}
