import type { CreateCredentialDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { Project, User, ICredentialsDb, ScopesField } from '@n8n/db';
import {
	CredentialsEntity,
	SharedCredentials,
	CredentialsRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	UserRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import {
	In,
	type EntityManager,
	type FindOptionsRelations,
	type FindOptionsWhere,
} from '@n8n/typeorm';
import { CredentialDataError, Credentials, ErrorReporter } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import { CREDENTIAL_EMPTY_VALUE, deepCopy, NodeHelpers, UnexpectedError } from 'n8n-workflow';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';
import { CredentialTypes } from '@/credential-types';
import { createCredentialsFromCredentialsEntity } from '@/credentials-helper';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { CredentialRequest, ListQuery } from '@/requests';
import { CredentialsTester } from '@/services/credentials-tester.service';
import { OwnershipService } from '@/services/ownership.service';
// eslint-disable-next-line import-x/no-cycle
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';

import { CredentialsFinderService } from './credentials-finder.service';

export type CredentialsGetSharedOptions =
	| { allowGlobalScope: true; globalScope: Scope }
	| { allowGlobalScope: false };

type CreateCredentialOptions = CreateCredentialDto & {
	isManaged: boolean;
};

@Service()
export class CredentialsService {
	constructor(
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly credentialsTester: CredentialsTester,
		private readonly externalHooks: ExternalHooks,
		private readonly credentialTypes: CredentialTypes,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly roleService: RoleService,
		private readonly userRepository: UserRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

	async getMany(
		user: User,
		{
			listQueryOptions = {},
			includeScopes = false,
			includeData = false,
			onlySharedWithMe = false,
		}: {
			listQueryOptions?: ListQuery.Options & { includeData?: boolean };
			includeScopes?: boolean;
			includeData?: boolean;
			onlySharedWithMe?: boolean;
		} = {},
	) {
		const returnAll = hasGlobalScope(user, 'credential:list');
		const isDefaultSelect = !listQueryOptions.select;
		const projectId =
			typeof listQueryOptions.filter?.projectId === 'string'
				? listQueryOptions.filter.projectId
				: undefined;

		if (onlySharedWithMe) {
			listQueryOptions.filter = {
				...listQueryOptions.filter,
				withRole: 'credential:user',
				user,
			};
		}

		if (includeData) {
			// We need the scopes to check if we're allowed to include the decrypted
			// data.
			// Only if the user has the `credential:update` scope the user is allowed
			// to get the data.
			includeScopes = true;
			listQueryOptions.includeData = true;
		}

		if (returnAll) {
			let project: Project | undefined;

			if (projectId) {
				try {
					project = await this.projectService.getProject(projectId);
				} catch {}
			}

			if (project?.type === 'personal') {
				listQueryOptions.filter = {
					...listQueryOptions.filter,
					withRole: 'credential:owner',
				};
			}

			let credentials = await this.credentialsRepository.findMany(listQueryOptions);

			if (isDefaultSelect) {
				// Since we're filtering using project ID as part of the relation,
				// we end up filtering out all the other relations, meaning that if
				// it's shared to a project, it won't be able to find the home project.
				// To solve this, we have to get all the relation now, even though
				// we're deleting them later.
				if (
					(listQueryOptions.filter?.shared as { projectId?: string })?.projectId ??
					onlySharedWithMe
				) {
					const relations = await this.sharedCredentialsRepository.getAllRelationsForCredentials(
						credentials.map((c) => c.id),
					);
					credentials.forEach((c) => {
						c.shared = relations.filter((r) => r.credentialsId === c.id);
					});
				}
				credentials = credentials.map((c) => this.ownershipService.addOwnedByAndSharedWith(c));
			}

			if (includeScopes) {
				const projectRelations = await this.projectService.getProjectRelationsForUser(user);
				credentials = credentials.map((c) => this.roleService.addScopes(c, user, projectRelations));
			}

			if (includeData) {
				credentials = credentials.map((c: CredentialsEntity & ScopesField) => {
					const data = c.scopes.includes('credential:update') ? this.decrypt(c) : undefined;
					// We never want to expose the oauthTokenData to the frontend, but it
					// expects it to check if the credential is already connected.
					if (data?.oauthTokenData) {
						data.oauthTokenData = true;
					}

					return {
						...c,
						data,
					} as unknown as CredentialsEntity;
				});
			}

			return credentials;
		}

		const ids = await this.credentialsFinderService.getCredentialIdsByUserAndRole([user.id], {
			scopes: ['credential:read'],
		});

		let credentials = await this.credentialsRepository.findMany(
			listQueryOptions,
			ids, // only accessible credentials
		);

		if (isDefaultSelect) {
			// Since we're filtering using project ID as part of the relation,
			// we end up filtering out all the other relations, meaning that if
			// it's shared to a project, it won't be able to find the home project.
			// To solve this, we have to get all the relation now, even though
			// we're deleting them later.
			if (
				(listQueryOptions.filter?.shared as { projectId?: string })?.projectId ??
				onlySharedWithMe
			) {
				const relations = await this.sharedCredentialsRepository.getAllRelationsForCredentials(
					credentials.map((c) => c.id),
				);
				credentials.forEach((c) => {
					c.shared = relations.filter((r) => r.credentialsId === c.id);
				});
			}

			credentials = credentials.map((c) => this.ownershipService.addOwnedByAndSharedWith(c));
		}

		if (includeScopes) {
			const projectRelations = await this.projectService.getProjectRelationsForUser(user);
			credentials = credentials.map((c) => this.roleService.addScopes(c, user, projectRelations));
		}

		if (includeData) {
			credentials = credentials.map((c: CredentialsEntity & ScopesField) => {
				return {
					...c,
					data: c.scopes.includes('credential:update') ? this.decrypt(c) : undefined,
				} as unknown as CredentialsEntity;
			});
		}

		return credentials;
	}

	/**
	 * @param user The user making the request
	 * @param options.workflowId The workflow that is being edited
	 * @param options.projectId The project owning the workflow This is useful
	 * for workflows that have not been saved yet.
	 */
	async getCredentialsAUserCanUseInAWorkflow(
		user: User,
		options: { workflowId: string } | { projectId: string },
	) {
		// necessary to get the scopes
		const projectRelations = await this.projectService.getProjectRelationsForUser(user);

		// get all credentials the user has access to
		const allCredentials = await this.credentialsFinderService.findCredentialsForUser(user, [
			'credential:read',
		]);

		// get all credentials the workflow or project has access to
		const allCredentialsForWorkflow =
			'workflowId' in options
				? (await this.findAllCredentialIdsForWorkflow(options.workflowId)).map((c) => c.id)
				: (await this.findAllCredentialIdsForProject(options.projectId)).map((c) => c.id);

		// the intersection of both is all credentials the user can use in this
		// workflow or project
		const intersection = allCredentials.filter((c) => allCredentialsForWorkflow.includes(c.id));

		return intersection
			.map((c) => this.roleService.addScopes(c, user, projectRelations))
			.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
				scopes: c.scopes,
				isManaged: c.isManaged,
			}));
	}

	async findAllCredentialIdsForWorkflow(workflowId: string): Promise<CredentialsEntity[]> {
		// If the workflow is owned by a personal project and the owner of the
		// project has global read permissions it can use all personal credentials.
		const user = await this.userRepository.findPersonalOwnerForWorkflow(workflowId);
		if (user && hasGlobalScope(user, 'credential:read')) {
			return await this.credentialsRepository.findAllPersonalCredentials();
		}

		// Otherwise the workflow can only use credentials from projects it's part
		// of.
		return await this.credentialsRepository.findAllCredentialsForWorkflow(workflowId);
	}

	async findAllCredentialIdsForProject(projectId: string): Promise<CredentialsEntity[]> {
		// If this is a personal project and the owner of the project has global
		// read permissions then all workflows in that project can use all
		// credentials of all personal projects.
		const user = await this.userRepository.findPersonalOwnerForProject(projectId);
		if (user && hasGlobalScope(user, 'credential:read')) {
			return await this.credentialsRepository.findAllPersonalCredentials();
		}

		// Otherwise only the credentials in this project can be used.
		return await this.credentialsRepository.findAllCredentialsForProject(projectId);
	}

	/**
	 * Retrieve the sharing that matches a user and a credential.
	 */
	// TODO: move to SharedCredentialsService
	async getSharing(
		user: User,
		credentialId: string,
		globalScopes: Scope[],
		relations: FindOptionsRelations<SharedCredentials> = { credentials: true },
	): Promise<SharedCredentials | null> {
		let where: FindOptionsWhere<SharedCredentials> = { credentialsId: credentialId };

		if (!hasGlobalScope(user, globalScopes, { mode: 'allOf' })) {
			where = {
				...where,
				role: 'credential:owner',
				project: {
					projectRelations: {
						role: 'project:personalOwner',
						userId: user.id,
					},
				},
			};
		}

		return await this.sharedCredentialsRepository.findOne({
			where,
			relations,
		});
	}

	async prepareUpdateData(
		data: CredentialRequest.CredentialProperties,
		decryptedData: ICredentialDataDecryptedObject,
	): Promise<CredentialsEntity> {
		const mergedData = deepCopy(data);
		if (mergedData.data) {
			mergedData.data = this.unredact(mergedData.data, decryptedData);
		}

		// This saves us a merge but requires some type casting. These
		// types are compatible for this case.
		const updateData = this.credentialsRepository.create(mergedData as ICredentialsDb);

		await validateEntity(updateData);

		// Do not overwrite the oauth data else data like the access or refresh token would get lost
		// every time anybody changes anything on the credentials even if it is just the name.
		if (decryptedData.oauthTokenData) {
			// @ts-ignore
			updateData.data.oauthTokenData = decryptedData.oauthTokenData;
		}
		return updateData;
	}

	createEncryptedData(credential: {
		id: string | null;
		name: string;
		type: string;
		data: ICredentialDataDecryptedObject;
	}): ICredentialsDb {
		const credentials = new Credentials(
			{ id: credential.id, name: credential.name },
			credential.type,
		);

		credentials.setData(credential.data);

		const newCredentialData = credentials.getDataToSave() as ICredentialsDb;

		// Add special database related data
		newCredentialData.updatedAt = new Date();

		return newCredentialData;
	}

	/**
	 * Decrypts the credentials data and redacts the content by default.
	 *
	 * If `includeRawData` is set to true it will not redact the data.
	 */
	decrypt(credential: CredentialsEntity, includeRawData = false) {
		const coreCredential = createCredentialsFromCredentialsEntity(credential);
		try {
			const data = coreCredential.getData();
			if (includeRawData) {
				return data;
			}
			return this.redact(data, credential);
		} catch (error) {
			if (error instanceof CredentialDataError) {
				this.errorReporter.error(error, {
					level: 'error',
					extra: { credentialId: credential.id },
					tags: { credentialType: credential.type },
				});
				return {};
			}
			throw error;
		}
	}

	async update(credentialId: string, newCredentialData: ICredentialsDb) {
		await this.externalHooks.run('credentials.update', [newCredentialData]);

		// Update the credentials in DB
		// @ts-ignore CAT-957
		await this.credentialsRepository.update(credentialId, newCredentialData);

		// We sadly get nothing back from "update". Neither if it updated a record
		// nor the new value. So query now the updated entry.
		return await this.credentialsRepository.findOneBy({ id: credentialId });
	}

	async save(
		credential: CredentialsEntity,
		encryptedData: ICredentialsDb,
		user: User,
		projectId?: string,
	) {
		// To avoid side effects
		const newCredential = new CredentialsEntity();
		Object.assign(newCredential, credential, encryptedData);

		await this.externalHooks.run('credentials.create', [encryptedData]);

		const { manager: dbManager } = this.credentialsRepository;
		const result = await dbManager.transaction(async (transactionManager) => {
			const savedCredential = await transactionManager.save<CredentialsEntity>(newCredential);

			savedCredential.data = newCredential.data;

			const project =
				projectId === undefined
					? await this.projectRepository.getPersonalProjectForUserOrFail(
							user.id,
							transactionManager,
						)
					: await this.projectService.getProjectWithScope(
							user,
							projectId,
							['credential:create'],
							transactionManager,
						);

			if (typeof projectId === 'string' && project === null) {
				throw new BadRequestError(
					"You don't have the permissions to save the credential in this project.",
				);
			}

			// Safe guard in case the personal project does not exist for whatever reason.
			if (project === null) {
				throw new UnexpectedError('No personal project found');
			}

			const newSharedCredential = this.sharedCredentialsRepository.create({
				role: 'credential:owner',
				credentials: savedCredential,
				projectId: project.id,
			});

			await transactionManager.save<SharedCredentials>(newSharedCredential);

			return savedCredential;
		});
		this.logger.debug('New credential created', {
			credentialId: newCredential.id,
			ownerId: user.id,
		});
		return result;
	}

	/**
	 * Deletes a credential.
	 *
	 * If the user does not have permission to delete the credential this does
	 * nothing and returns void.
	 */
	async delete(user: User, credentialId: string) {
		await this.externalHooks.run('credentials.delete', [credentialId]);

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:delete'],
		);

		if (!credential) {
			return;
		}

		await this.credentialsRepository.remove(credential);
	}

	async test(userId: User['id'], credentials: ICredentialsDecrypted) {
		return await this.credentialsTester.testCredentials(userId, credentials.type, credentials);
	}

	// Take data and replace all sensitive values with a sentinel value.
	// This will replace password fields and oauth data.
	redact(data: ICredentialDataDecryptedObject, credential: CredentialsEntity) {
		const copiedData = deepCopy(data);

		let credType: ICredentialType;
		try {
			credType = this.credentialTypes.getByName(credential.type);
		} catch {
			// This _should_ only happen when testing. If it does happen in
			// production it means it's either a mangled credential or a
			// credential for a removed community node. Either way, there's
			// no way to know what to redact.
			return data;
		}

		const getExtendedProps = (type: ICredentialType) => {
			const props: INodeProperties[] = [];
			for (const e of type.extends ?? []) {
				const extendsType = this.credentialTypes.getByName(e);
				const extendedProps = getExtendedProps(extendsType);
				NodeHelpers.mergeNodeProperties(props, extendedProps);
			}
			NodeHelpers.mergeNodeProperties(props, type.properties);
			return props;
		};
		const properties = getExtendedProps(credType);

		for (const dataKey of Object.keys(copiedData)) {
			// The frontend only cares that this value isn't falsy.
			if (dataKey === 'oauthTokenData' || dataKey === 'csrfSecret') {
				if (copiedData[dataKey].toString().length > 0) {
					copiedData[dataKey] = CREDENTIAL_BLANKING_VALUE;
				} else {
					copiedData[dataKey] = CREDENTIAL_EMPTY_VALUE;
				}
				continue;
			}
			const prop = properties.find((v) => v.name === dataKey);
			if (!prop) {
				continue;
			}
			if (
				prop.typeOptions?.password &&
				(!(copiedData[dataKey] as string).startsWith('={{') || prop.noDataExpression)
			) {
				if (copiedData[dataKey].toString().length > 0) {
					copiedData[dataKey] = CREDENTIAL_BLANKING_VALUE;
				} else {
					copiedData[dataKey] = CREDENTIAL_EMPTY_VALUE;
				}
			}
		}

		return copiedData;
	}

	private unredactRestoreValues(unmerged: any, replacement: any) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		for (const [key, value] of Object.entries(unmerged)) {
			if (value === CREDENTIAL_BLANKING_VALUE || value === CREDENTIAL_EMPTY_VALUE) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				unmerged[key] = replacement[key];
			} else if (
				typeof value === 'object' &&
				value !== null &&
				key in replacement &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				typeof replacement[key] === 'object' &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				replacement[key] !== null
			) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				this.unredactRestoreValues(value, replacement[key]);
			}
		}
	}

	// Take unredacted data (probably from the DB) and merge it with
	// redacted data to create an unredacted version.
	unredact(
		redactedData: ICredentialDataDecryptedObject,
		savedData: ICredentialDataDecryptedObject,
	) {
		// Replace any blank sentinel values with their saved version
		const mergedData = deepCopy(redactedData);
		this.unredactRestoreValues(mergedData, savedData);
		return mergedData;
	}

	async getOne(user: User, credentialId: string, includeDecryptedData: boolean) {
		let sharing: SharedCredentials | null = null;
		let decryptedData: ICredentialDataDecryptedObject | null = null;

		sharing = includeDecryptedData
			? // Try to get the credential with `credential:update` scope, which
				// are required for decrypting the data.
				await this.getSharing(user, credentialId, [
					'credential:read',
					// TODO: Enable this once the scope exists and has been added to the
					// global:owner role.
					// 'credential:decrypt',
				])
			: null;

		if (sharing) {
			// Decrypt the data if we found the credential with the `credential:update`
			// scope.
			decryptedData = this.decrypt(sharing.credentials);
		} else {
			// Otherwise try to find them with only the `credential:read` scope. In
			// that case we return them without the decrypted data.
			sharing = await this.getSharing(user, credentialId, ['credential:read']);
		}

		if (!sharing) {
			throw new NotFoundError(`Credential with ID "${credentialId}" could not be found.`);
		}

		const { credentials: credential } = sharing;

		const { data: _, ...rest } = credential;

		if (decryptedData) {
			// We never want to expose the oauthTokenData to the frontend, but it
			// expects it to check if the credential is already connected.
			if (decryptedData?.oauthTokenData) {
				decryptedData.oauthTokenData = true;
			}
			return { data: decryptedData, ...rest };
		}
		return { ...rest };
	}

	async getCredentialScopes(user: User, credentialId: string): Promise<Scope[]> {
		const userProjectRelations = await this.projectService.getProjectRelationsForUser(user);
		const shared = await this.sharedCredentialsRepository.find({
			where: {
				projectId: In([...new Set(userProjectRelations.map((pr) => pr.projectId))]),
				credentialsId: credentialId,
			},
		});
		return this.roleService.combineResourceScopes('credential', user, shared, userProjectRelations);
	}

	/**
	 * Transfers all credentials owned by a project to another one.
	 * This has only been tested for personal projects. It may need to be amended
	 * for team projects.
	 **/
	async transferAll(fromProjectId: string, toProjectId: string, trx?: EntityManager) {
		trx = trx ?? this.credentialsRepository.manager;

		// Get all shared credentials for both projects.
		const allSharedCredentials = await trx.findBy(SharedCredentials, {
			projectId: In([fromProjectId, toProjectId]),
		});

		const sharedCredentialsOfFromProject = allSharedCredentials.filter(
			(sc) => sc.projectId === fromProjectId,
		);

		// For all credentials that the from-project owns transfer the ownership
		// to the to-project.
		// This will override whatever relationship the to-project already has to
		// the resources at the moment.
		const ownedCredentialIds = sharedCredentialsOfFromProject
			.filter((sc) => sc.role === 'credential:owner')
			.map((sc) => sc.credentialsId);

		await this.sharedCredentialsRepository.makeOwner(ownedCredentialIds, toProjectId, trx);

		// Delete the relationship to the from-project.
		await this.sharedCredentialsRepository.deleteByIds(ownedCredentialIds, fromProjectId, trx);

		// Transfer relationships that are not `credential:owner`.
		// This will NOT override whatever relationship the to-project already has
		// to the resource at the moment.
		const sharedCredentialIdsOfTransferee = allSharedCredentials
			.filter((sc) => sc.projectId === toProjectId)
			.map((sc) => sc.credentialsId);

		// All resources that are shared with the from-project, but not with the
		// to-project.
		const sharedCredentialsToTransfer = sharedCredentialsOfFromProject.filter(
			(sc) =>
				sc.role !== 'credential:owner' &&
				!sharedCredentialIdsOfTransferee.includes(sc.credentialsId),
		);

		await trx.insert(
			SharedCredentials,
			sharedCredentialsToTransfer.map((sc) => ({
				credentialsId: sc.credentialsId,
				projectId: toProjectId,
				role: sc.role,
			})),
		);
	}

	async replaceCredentialContentsForSharee(
		user: User,
		credential: CredentialsEntity,
		decryptedData: ICredentialDataDecryptedObject,
		mergedCredentials: ICredentialsDecrypted,
	) {
		// We may want to change this to 'credential:decrypt' if that gets added, but this
		// works for now. The only time we wouldn't want to do this is if the user
		// could actually be testing the credential before saving it, so this should cover
		// the cases we need it for.
		if (
			!(await userHasScopes(user, ['credential:update'], false, { credentialId: credential.id }))
		) {
			mergedCredentials.data = decryptedData;
		}
	}

	/**
	 * Create a new credential in user's account and return it along the scopes
	 * If a projectId is send, then it also binds the credential to that specific project
	 */
	async createUnmanagedCredential(dto: CreateCredentialDto, user: User) {
		return await this.createCredential({ ...dto, isManaged: false }, user);
	}

	/**
	 * Create a new managed credential in user's account and return it along the scopes.
	 * Managed credentials are managed by n8n and cannot be edited by the user.
	 */
	async createManagedCredential(dto: CreateCredentialDto, user: User) {
		return await this.createCredential({ ...dto, isManaged: true }, user);
	}

	private async createCredential(opts: CreateCredentialOptions, user: User) {
		const encryptedCredential = this.createEncryptedData({
			id: null,
			name: opts.name,
			type: opts.type,
			data: opts.data as ICredentialDataDecryptedObject,
		});

		const credentialEntity = this.credentialsRepository.create({
			...encryptedCredential,
			isManaged: opts.isManaged,
		});

		const { shared, ...credential } = await this.save(
			credentialEntity,
			encryptedCredential,
			user,
			opts.projectId,
		);

		const scopes = await this.getCredentialScopes(user, credential.id);

		return { ...credential, scopes };
	}
}
