import {
	CredentialsEntity,
	Project,
	User,
	SharedCredentials,
	ProjectRepository,
	GLOBAL_OWNER_ROLE,
} from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';
import glob from 'fast-glob';
import fs from 'fs';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { Cipher } from 'n8n-core';
import { jsonParse, UserError } from 'n8n-workflow';
import { z } from 'zod';

import { UM_FIX_INSTRUCTION } from '@/constants';

import { BaseCommand } from '../base-command';

type ReadCredentialsOptions = {
	inputPath: string;
	separate: boolean;
	include?: string[];
	exclude?: string[];
};

const flagsSchema = z.object({
	input: z
		.string()
		.alias('i')
		.describe('Input file name or directory if --separate is used')
		.optional(),
	separate: z
		.boolean()
		.default(false)
		.describe('Imports *.json files from directory provided by --input'),
	include: z
		.string()
		.describe('Comma-separated credential properties to include during import')
		.optional(),
	exclude: z
		.string()
		.describe('Comma-separated credential properties to exclude during import')
		.optional(),
	userId: z
		.string()
		.describe('The ID of the user to assign the imported credentials to')
		.optional(),
	projectId: z
		.string()
		.describe('The ID of the project to assign the imported credential to')
		.optional(),
});

type ImportableCredentialProperty = Exclude<
	Extract<keyof CredentialsEntity, string>,
	'shared' | 'toJSON' | 'generateId' | 'setUpdateDate'
>;

@Command({
	name: 'import:credentials',
	description: 'Import credentials',
	examples: [
		'--input=file.json',
		'--separate --input=backups/latest/',
		'--input=file.json --include=id,name,type,data',
		'--input=file.json --exclude=createdAt,updatedAt',
		'--input=file.json --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
		'--input=file.json --projectId=Ox8O54VQrmBrb4qL',
		'--separate --input=backups/latest/ --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
	],
	flagsSchema,
})
export class ImportCredentialsCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	private transactionManager: EntityManager;

	async run(): Promise<void> {
		const { flags } = this;

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
			throw new UserError(
				'You cannot use `--userId` and `--projectId` together. Use one or the other.',
			);
		}

		if (flags.include && flags.exclude) {
			throw new UserError(
				'You cannot use `--include` and `--exclude` together. Use one or the other.',
			);
		}

		const include = this.parseCredentialProperties(flags.include, '--include');
		const exclude = this.parseCredentialProperties(flags.exclude, '--exclude');

		const credentials = await this.readCredentials({
			inputPath: flags.input,
			separate: flags.separate,
			include,
			exclude,
		});

		const { manager: dbManager } = Container.get(ProjectRepository);
		await dbManager.transaction(async (transactionManager) => {
			this.transactionManager = transactionManager;

			const project = await this.getProject(flags.userId, flags.projectId);

			const result = await this.checkRelations(credentials, flags.projectId, flags.userId);

			if (!result.success) {
				throw new UserError(result.message);
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
		credentials: Array<Pick<Partial<CredentialsEntity>, 'id'>>,
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

	private async readCredentials(
		options: ReadCredentialsOptions,
	): Promise<Array<Partial<CredentialsEntity>>> {
		const { separate, include, exclude } = options;
		const cipher = Container.get(Cipher);
		let { inputPath } = options;

		if (process.platform === 'win32') {
			inputPath = inputPath.replace(/\\/g, '/');
		}

		let credentials: Array<Partial<CredentialsEntity>>;

		if (separate) {
			const files = await glob('*.json', {
				cwd: inputPath,
				absolute: true,
			});

			credentials = files.map((file) =>
				jsonParse<Partial<CredentialsEntity>>(fs.readFileSync(file, { encoding: 'utf8' })),
			);
		} else {
			const credentialsUnchecked = jsonParse<Array<Partial<CredentialsEntity>>>(
				fs.readFileSync(inputPath, { encoding: 'utf8' }),
			);

			if (!Array.isArray(credentialsUnchecked)) {
				throw new UserError(
					'File does not seem to contain credentials. Make sure the credentials are contained in an array.',
				);
			}

			credentials = credentialsUnchecked;
		}

		const knownProperties = new Set(credentials.flatMap((credential) => Object.keys(credential)));
		this.warnOnUnknownProperties(include, knownProperties, '--include');
		this.warnOnUnknownProperties(exclude, knownProperties, '--exclude');

		return await Promise.all(
			credentials.map(async (credential) => {
				const filteredCredential = this.filterCredentialProperties(credential, include, exclude);
				if (typeof filteredCredential.data === 'object') {
					// plain data / decrypted input. Should be encrypted first.
					filteredCredential.data = await cipher.encryptV2(filteredCredential.data);
				}

				return filteredCredential;
			}),
		);
	}

	private parseCredentialProperties(
		value: string | undefined,
		flagName: '--include' | '--exclude',
	) {
		if (!value) return undefined;

		const propertyCandidates = value.split(',');
		const trimmedProperties = propertyCandidates.map((property) => property.trim());
		const nonEmptyProperties = trimmedProperties.filter(Boolean);
		const uniqueProperties = Array.from(new Set(nonEmptyProperties));

		if (uniqueProperties.length === 0) {
			throw new UserError(`${flagName} must contain at least one property name.`);
		}

		return uniqueProperties;
	}

	private warnOnUnknownProperties(
		properties: string[] | undefined,
		knownProperties: Set<string>,
		flagName: '--include' | '--exclude',
	) {
		if (!properties?.length) return;

		const unknownProperties = properties.filter((property) => !knownProperties.has(property));
		if (unknownProperties.length === 0) return;

		this.logger.warn(
			`Ignoring unknown properties from ${flagName}: ${unknownProperties.join(', ')}`,
		);
	}

	private filterCredentialProperties(
		credential: Partial<CredentialsEntity>,
		include?: string[],
		exclude?: string[],
	): Partial<CredentialsEntity> {
		if (include?.length) {
			const includeProperties = include.filter((property) =>
				this.isCredentialPropertyImportable(property),
			);
			if (includeProperties.length === 0) {
				throw new UserError('No importable properties found. Please check the --include flag.');
			}
			return pick(credential, includeProperties);
		}

		if (exclude?.length) {
			const excludeProperties = exclude.filter((property) =>
				this.isCredentialPropertyImportable(property),
			);
			return omit(credential, excludeProperties);
		}

		return credential;
	}

	private isCredentialPropertyImportable(
		property: string,
	): property is ImportableCredentialProperty {
		const importableProperties = {
			createdAt: true,
			updatedAt: true,
			id: true,
			name: true,
			data: true,
			type: true,
			isManaged: true,
			isGlobal: true,
			isResolvable: true,
			resolvableAllowFallback: true,
			resolverId: true,
		} satisfies Record<ImportableCredentialProperty, true>;

		return property in importableProperties;
	}

	private async getCredentialOwner(credentialsId: string) {
		const sharedCredential = await this.transactionManager.findOne(SharedCredentials, {
			where: { credentialsId, role: 'credential:owner' },
			relations: { project: true },
		});

		if (sharedCredential && sharedCredential.project.type === 'personal') {
			const user = await this.transactionManager.findOneByOrFail(User, {
				projectRelations: {
					role: { slug: PROJECT_OWNER_ROLE_SLUG },
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
			const owner = await this.transactionManager.findOneBy(User, {
				role: {
					slug: GLOBAL_OWNER_ROLE.slug,
				},
			});
			if (!owner) {
				throw new UserError(`Failed to find owner. ${UM_FIX_INSTRUCTION}`);
			}
			userId = owner.id;
		}

		return await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			userId,
			this.transactionManager,
		);
	}
}
