import { Container } from 'typedi';
import { Flags } from '@oclif/core';
import { Cipher } from 'n8n-core';
import fs from 'fs';
import glob from 'fast-glob';
import type { EntityManager } from '@n8n/typeorm';

import * as Db from '@/Db';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { BaseCommand } from '../BaseCommand';
import type { ICredentialsEncrypted } from 'n8n-workflow';
import { ApplicationError, jsonParse } from 'n8n-workflow';
import { UM_FIX_INSTRUCTION } from '@/constants';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { Project } from '@/databases/entities/Project';
import { User } from '@/databases/entities/User';

export class ImportCredentialsCommand extends BaseCommand {
	static description = 'Import credentials';

	static examples = [
		'$ n8n import:credentials --input=file.json',
		'$ n8n import:credentials --separate --input=backups/latest/',
		'$ n8n import:credentials --input=file.json --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
		'$ n8n import:credentials --input=file.json --projectId=Ox8O54VQrmBrb4qL',
		'$ n8n import:credentials --separate --input=backups/latest/ --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
	];

	static flags = {
		help: Flags.help({ char: 'h' }),
		input: Flags.string({
			char: 'i',
			description: 'Input file name or directory if --separate is used',
		}),
		separate: Flags.boolean({
			description: 'Imports *.json files from directory provided by --input',
		}),
		userId: Flags.string({
			description: 'The ID of the user to assign the imported credentials to',
		}),
		projectId: Flags.string({
			description: 'The ID of the project to assign the imported credential to',
		}),
	};

	private transactionManager: EntityManager;

	async run(): Promise<void> {
		const { flags } = await this.parse(ImportCredentialsCommand);

		if (!flags.input) {
			this.logger.info('An input file or directory with --input must be provided');
			return;
		}

		if (flags.separate) {
			if (fs.existsSync(flags.input)) {
				if (!fs.lstatSync(flags.input).isDirectory()) {
					this.logger.info('The argument to --input must be a directory');
					return;
				}
			}
		}

		if (flags.projectId && flags.userId) {
			throw new ApplicationError(
				'You cannot use `--userId` and `--projectId` together. Use one or the other.',
			);
		}

		const credentials = await this.readCredentials(flags.input, flags.separate);

		await Db.getConnection().transaction(async (transactionManager) => {
			this.transactionManager = transactionManager;

			const project = await this.getProject(flags.userId, flags.projectId);

			const result = await this.checkRelations(credentials, flags.projectId, flags.userId);

			if (!result.success) {
				throw new ApplicationError(result.message);
			}

			for (const credential of credentials) {
				await this.storeCredential(credential, project);
			}
		});

		this.reportSuccess(credentials.length);
	}

	async catch(error: Error) {
		this.logger.error(
			'An error occurred while importing credentials. See log messages for details.',
		);
		this.logger.error(error.message);
	}

	private reportSuccess(total: number) {
		this.logger.info(
			`Successfully imported ${total} ${total === 1 ? 'credential.' : 'credentials.'}`,
		);
	}

	private async storeCredential(credential: Partial<CredentialsEntity>, project: Project) {
		const result = await this.transactionManager.upsert(CredentialsEntity, credential, ['id']);

		const sharingExists = await this.transactionManager.existsBy(SharedCredentials, {
			credentialsId: credential.id,
			role: 'credential:owner',
		});

		if (!sharingExists) {
			await this.transactionManager.upsert(
				SharedCredentials,
				{
					credentialsId: result.identifiers[0].id as string,
					role: 'credential:owner',
					projectId: project.id,
				},
				['credentialsId', 'projectId'],
			);
		}
	}

	private async checkRelations(
		credentials: ICredentialsEncrypted[],
		projectId?: string,
		userId?: string,
	) {
		// The credential is not supposed to be re-owned.
		if (!projectId && !userId) {
			return {
				success: true as const,
				message: undefined,
			};
		}

		for (const credential of credentials) {
			if (credential.id === undefined) {
				continue;
			}

			if (!(await this.credentialExists(credential.id))) {
				continue;
			}

			const { user, project: ownerProject } = await this.getCredentialOwner(credential.id);

			if (!ownerProject) {
				continue;
			}

			if (ownerProject.id !== projectId) {
				const currentOwner =
					ownerProject.type === 'personal'
						? `the user with the ID "${user.id}"`
						: `the project with the ID "${ownerProject.id}"`;
				const newOwner = userId
					? // The user passed in `--userId`, so let's use the user ID in the error
						// message as opposed to the project ID.
						`the user with the ID "${userId}"`
					: `the project with the ID "${projectId}"`;

				return {
					success: false as const,
					message: `The credential with ID "${credential.id}" is already owned by ${currentOwner}. It can't be re-owned by ${newOwner}.`,
				};
			}
		}

		return {
			success: true as const,
			message: undefined,
		};
	}

	private async readCredentials(path: string, separate: boolean): Promise<ICredentialsEncrypted[]> {
		const cipher = Container.get(Cipher);

		if (process.platform === 'win32') {
			path = path.replace(/\\/g, '/');
		}

		let credentials: ICredentialsEncrypted[];

		if (separate) {
			const files = await glob('*.json', {
				cwd: path,
				absolute: true,
			});

			credentials = files.map((file) =>
				jsonParse<ICredentialsEncrypted>(fs.readFileSync(file, { encoding: 'utf8' })),
			);
		} else {
			const credentialsUnchecked = jsonParse<ICredentialsEncrypted[]>(
				fs.readFileSync(path, { encoding: 'utf8' }),
			);

			if (!Array.isArray(credentialsUnchecked)) {
				throw new ApplicationError(
					'File does not seem to contain credentials. Make sure the credentials are contained in an array.',
				);
			}

			credentials = credentialsUnchecked;
		}

		return credentials.map((credential) => {
			if (typeof credential.data === 'object') {
				// plain data / decrypted input. Should be encrypted first.
				credential.data = cipher.encrypt(credential.data);
			}

			return credential;
		});
	}

	private async getCredentialOwner(credentialsId: string) {
		const sharedCredential = await this.transactionManager.findOne(SharedCredentials, {
			where: { credentialsId, role: 'credential:owner' },
			relations: { project: true },
		});

		if (sharedCredential && sharedCredential.project.type === 'personal') {
			const user = await this.transactionManager.findOneByOrFail(User, {
				projectRelations: {
					role: 'project:personalOwner',
					projectId: sharedCredential.projectId,
				},
			});

			return { user, project: sharedCredential.project };
		}

		return {};
	}

	private async credentialExists(credentialId: string) {
		return await this.transactionManager.existsBy(CredentialsEntity, { id: credentialId });
	}

	private async getProject(userId?: string, projectId?: string) {
		if (projectId) {
			return await this.transactionManager.findOneByOrFail(Project, { id: projectId });
		}

		if (!userId) {
			const owner = await this.transactionManager.findOneBy(User, { role: 'global:owner' });
			if (!owner) {
				throw new ApplicationError(`Failed to find owner. ${UM_FIX_INSTRUCTION}`);
			}
			userId = owner.id;
		}

		return await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			userId,
			this.transactionManager,
		);
	}
}
