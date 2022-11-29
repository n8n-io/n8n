/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
import { Command, flags } from '@oclif/command';

import { Credentials, UserSettings } from 'n8n-core';

import { LoggerProxy } from 'n8n-workflow';

import fs from 'fs';
import glob from 'fast-glob';
import { EntityManager, getConnection } from 'typeorm';
import { getLogger } from '@/Logger';
import * as Db from '@/Db';
import { User } from '@db/entities/User';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import { Role } from '@db/entities/Role';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';

const FIX_INSTRUCTION =
	'Please fix the database by running ./packages/cli/bin/n8n user-management:reset';

export class ImportCredentialsCommand extends Command {
	static description = 'Import credentials';

	static examples = [
		'$ n8n import:credentials --input=file.json',
		'$ n8n import:credentials --separate --input=backups/latest/',
		'$ n8n import:credentials --input=file.json --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
		'$ n8n import:credentials --separate --input=backups/latest/ --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
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
		userId: flags.string({
			description: 'The ID of the user to assign the imported credentials to',
		}),
	};

	ownerCredentialRole: Role;

	transactionManager: EntityManager;

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

		let totalImported = 0;

		try {
			await Db.init();

			await this.initOwnerCredentialRole();
			const user = flags.userId ? await this.getAssignee(flags.userId) : await this.getOwner();

			// Make sure the settings exist
			await UserSettings.prepareUserSettings();

			const encryptionKey = await UserSettings.getEncryptionKey();

			if (flags.separate) {
				let { input: inputPath } = flags;

				if (process.platform === 'win32') {
					inputPath = inputPath.replace(/\\/g, '/');
				}

				const files = await glob('*.json', {
					cwd: inputPath,
					absolute: true,
				});

				totalImported = files.length;

				await getConnection().transaction(async (transactionManager) => {
					this.transactionManager = transactionManager;
					for (const file of files) {
						const credential = JSON.parse(fs.readFileSync(file, { encoding: 'utf8' }));

						if (typeof credential.data === 'object') {
							// plain data / decrypted input. Should be encrypted first.
							Credentials.prototype.setData.call(credential, credential.data, encryptionKey);
						}

						await this.storeCredential(credential, user);
					}
				});

				this.reportSuccess(totalImported);
				process.exit();
			}

			const credentials = JSON.parse(fs.readFileSync(flags.input, { encoding: 'utf8' }));

			totalImported = credentials.length;

			if (!Array.isArray(credentials)) {
				throw new Error(
					'File does not seem to contain credentials. Make sure the credentials are contained in an array.',
				);
			}

			await getConnection().transaction(async (transactionManager) => {
				this.transactionManager = transactionManager;
				for (const credential of credentials) {
					if (typeof credential.data === 'object') {
						// plain data / decrypted input. Should be encrypted first.
						Credentials.prototype.setData.call(credential, credential.data, encryptionKey);
					}
					await this.storeCredential(credential, user);
				}
			});

			this.reportSuccess(totalImported);
			process.exit();
		} catch (error) {
			console.error('An error occurred while importing credentials. See log messages for details.');
			if (error instanceof Error) logger.error(error.message);
			this.exit(1);
		}
	}

	private reportSuccess(total: number) {
		console.info(`Successfully imported ${total} ${total === 1 ? 'credential.' : 'credentials.'}`);
	}

	private async initOwnerCredentialRole() {
		const ownerCredentialRole = await Db.collections.Role.findOne({
			where: { name: 'owner', scope: 'credential' },
		});

		if (!ownerCredentialRole) {
			throw new Error(`Failed to find owner credential role. ${FIX_INSTRUCTION}`);
		}

		this.ownerCredentialRole = ownerCredentialRole;
	}

	private async storeCredential(credential: object, user: User) {
		const newCredential = new CredentialsEntity();

		Object.assign(newCredential, credential);

		const savedCredential = await this.transactionManager.save<CredentialsEntity>(newCredential);

		const newSharedCredential = new SharedCredentials();

		Object.assign(newSharedCredential, {
			credentials: savedCredential,
			user,
			role: this.ownerCredentialRole,
		});

		await this.transactionManager.save<SharedCredentials>(newSharedCredential);
	}

	private async getOwner() {
		const ownerGlobalRole = await Db.collections.Role.findOne({
			where: { name: 'owner', scope: 'global' },
		});

		const owner = await Db.collections.User.findOne({ globalRole: ownerGlobalRole });

		if (!owner) {
			throw new Error(`Failed to find owner. ${FIX_INSTRUCTION}`);
		}

		return owner;
	}

	private async getAssignee(userId: string) {
		const user = await Db.collections.User.findOne(userId);

		if (!user) {
			throw new Error(`Failed to find user with ID ${userId}`);
		}

		return user;
	}
}
