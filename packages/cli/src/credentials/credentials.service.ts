import { Credentials } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import { ApplicationError, CREDENTIAL_EMPTY_VALUE, deepCopy, NodeHelpers } from 'n8n-workflow';
import {
	In,
	type EntityManager,
	type FindOptionsRelations,
	type FindOptionsWhere,
} from '@n8n/typeorm';
import type { Scope } from '@n8n/permissions';
import * as Db from '@/Db';
import type { ICredentialsDb } from '@/Interfaces';
import { createCredentialsFromCredentialsEntity } from '@/CredentialsHelper';
import { CREDENTIAL_BLANKING_VALUE } from '@/constants';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import { validateEntity } from '@/GenericHelpers';
import { ExternalHooks } from '@/ExternalHooks';
import type { User } from '@db/entities/User';
import type { CredentialRequest, ListQuery } from '@/requests';
import { CredentialTypes } from '@/CredentialTypes';
import { OwnershipService } from '@/services/ownership.service';
import { Logger } from '@/Logger';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { Service } from 'typedi';
import { CredentialsTester } from '@/services/credentials-tester.service';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { ProjectService } from '@/services/project.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ProjectRelation } from '@/databases/entities/ProjectRelation';
import { RoleService } from '@/services/role.service';

export type CredentialsGetSharedOptions =
	| { allowGlobalScope: true; globalScope: Scope }
	| { allowGlobalScope: false };

@Service()
export class CredentialsService {
	constructor(
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
		private readonly credentialsTester: CredentialsTester,
		private readonly externalHooks: ExternalHooks,
		private readonly credentialTypes: CredentialTypes,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly roleService: RoleService,
	) {}

	async getMany(
		user: User,
		options: {
			listQueryOptions?: ListQuery.Options;
			onlyOwn?: boolean;
			includeScopes?: string;
		} = {},
	) {
		const returnAll = user.hasGlobalScope('credential:list') && !options.onlyOwn;
		const isDefaultSelect = !options.listQueryOptions?.select;

		let projectRelations: ProjectRelation[] | undefined = undefined;
		if (options.includeScopes) {
			projectRelations = await this.projectService.getProjectRelationsForUser(user);
			if (options.listQueryOptions?.filter?.projectId && user.hasGlobalScope('credential:list')) {
				// Only instance owners and admins have the credential:list scope
				// Those users should be able to use _all_ credentials within their workflows.
				// TODO: Change this so we filter by `workflowId` in this case. Require a slight FE change
				const projectRelation = projectRelations.find(
					(relation) => relation.projectId === options.listQueryOptions?.filter?.projectId,
				);
				if (projectRelation?.role === 'project:personalOwner') {
					// Will not affect team projects as these have admins, not owners.
					delete options.listQueryOptions?.filter?.projectId;
				}
			}
		}

		if (returnAll) {
			let credentials = await this.credentialsRepository.findMany(options.listQueryOptions);

			if (isDefaultSelect) {
				credentials = credentials.map((c) => this.ownershipService.addOwnedByAndSharedWith(c));
			}

			if (options.includeScopes) {
				credentials = credentials.map((c) =>
					this.roleService.addScopes(c, user, projectRelations!),
				);
			}

			credentials.forEach((c) => {
				// @ts-expect-error: This is to emulate the old behaviour of removing the shared
				// field as part of `addOwnedByAndSharedWith`. We need this field in `addScopes`
				// though. So to avoid leaking the information we just delete it.
				delete c.shared;
			});

			return credentials;
		}

		// If the workflow is part of a personal project we want to show the credentials the user making the request has access to, not the credentials the user owning the workflow has access to.
		if (typeof options.listQueryOptions?.filter?.projectId === 'string') {
			const project = await this.projectService.getProject(
				options.listQueryOptions.filter.projectId,
			);
			if (project?.type === 'personal') {
				const currentUsersPersonalProject = await this.projectService.getPersonalProject(user);
				options.listQueryOptions.filter.projectId = currentUsersPersonalProject?.id;
			}
		}

		const ids = await this.sharedCredentialsRepository.getCredentialIdsByUserAndRole([user.id], {
			scopes: ['credential:read'],
		});

		let credentials = await this.credentialsRepository.findMany(
			options.listQueryOptions,
			ids, // only accessible credentials
		);

		if (isDefaultSelect) {
			credentials = credentials.map((c) => this.ownershipService.addOwnedByAndSharedWith(c));
		}

		if (options.includeScopes) {
			credentials = credentials.map((c) => this.roleService.addScopes(c, user, projectRelations!));
		}

		credentials.forEach((c) => {
			// @ts-expect-error: This is to emulate the old behaviour of removing the shared
			// field as part of `addOwnedByAndSharedWith`. We need this field in `addScopes`
			// though. So to avoid leaking the information we just delete it.
			delete c.shared;
		});

		return credentials;
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

		if (!user.hasGlobalScope(globalScopes, { mode: 'allOf' })) {
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

	async prepareCreateData(
		data: CredentialRequest.CredentialProperties,
	): Promise<CredentialsEntity> {
		const { id, ...rest } = data;

		// This saves us a merge but requires some type casting. These
		// types are compatible for this case.
		const newCredentials = this.credentialsRepository.create(rest as ICredentialsDb);

		await validateEntity(newCredentials);

		return newCredentials;
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

	createEncryptedData(credentialId: string | null, data: CredentialsEntity): ICredentialsDb {
		const credentials = new Credentials({ id: credentialId, name: data.name }, data.type);

		credentials.setData(data.data as unknown as ICredentialDataDecryptedObject);

		const newCredentialData = credentials.getDataToSave() as ICredentialsDb;

		// Add special database related data
		newCredentialData.updatedAt = new Date();

		return newCredentialData;
	}

	decrypt(credential: CredentialsEntity) {
		const coreCredential = createCredentialsFromCredentialsEntity(credential);
		return coreCredential.getData();
	}

	async update(credentialId: string, newCredentialData: ICredentialsDb) {
		await this.externalHooks.run('credentials.update', [newCredentialData]);

		// Update the credentials in DB
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

		const result = await Db.transaction(async (transactionManager) => {
			const savedCredential = await transactionManager.save<CredentialsEntity>(newCredential);

			savedCredential.data = newCredential.data;

			const project =
				projectId === undefined
					? await this.projectRepository.getPersonalProjectForUserOrFail(user.id)
					: await this.projectService.getProjectWithScope(
							user,
							projectId,
							['credential:create'],
							transactionManager,
						);

			if (typeof projectId === 'string' && project === null) {
				throw new BadRequestError(
					"You don't have the permissions to save the workflow in this project.",
				);
			}

			// Safe guard in case the personal project does not exist for whatever reason.
			if (project === null) {
				throw new ApplicationError('No personal project found');
			}

			const newSharedCredential = this.sharedCredentialsRepository.create({
				role: 'credential:owner',
				credentials: savedCredential,
				projectId: project.id,
			});

			await transactionManager.save<SharedCredentials>(newSharedCredential);

			return savedCredential;
		});
		this.logger.verbose('New credential created', {
			credentialId: newCredential.id,
			ownerId: user.id,
		});
		return result;
	}

	async delete(credentials: CredentialsEntity) {
		await this.externalHooks.run('credentials.delete', [credentials.id]);

		await this.credentialsRepository.remove(credentials);
	}

	async test(user: User, credentials: ICredentialsDecrypted) {
		return await this.credentialsTester.testCredentials(user, credentials.type, credentials);
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
			if (dataKey === 'oauthTokenData') {
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
			decryptedData = this.redact(this.decrypt(sharing.credentials), sharing.credentials);
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

	replaceCredentialContentsForSharee(
		user: User,
		credential: CredentialsEntity,
		decryptedData: ICredentialDataDecryptedObject,
		mergedCredentials: ICredentialsDecrypted,
	) {
		credential.shared.forEach((sharedCredentials) => {
			if (sharedCredentials.role === 'credential:owner') {
				if (sharedCredentials.project.type === 'personal') {
					// Find the owner of this personal project
					sharedCredentials.project.projectRelations.forEach((projectRelation) => {
						if (
							projectRelation.role === 'project:personalOwner' &&
							projectRelation.user.id !== user.id
						) {
							// If we realize that the current user does not own this credential
							// We replace the payload with the stored decrypted data
							mergedCredentials.data = decryptedData;
						}
					});
				}
			}
		});
	}
}
