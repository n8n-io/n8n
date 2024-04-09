import { Credentials } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import { CREDENTIAL_EMPTY_VALUE, deepCopy, NodeHelpers } from 'n8n-workflow';
import type { FindOptionsWhere } from '@n8n/typeorm';
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
	) {}

	async get(where: FindOptionsWhere<ICredentialsDb>, options?: { relations: string[] }) {
		return await this.credentialsRepository.findOne({
			relations: options?.relations,
			where,
		});
	}

	async getMany(
		user: User,
		options: { listQueryOptions?: ListQuery.Options; onlyOwn?: boolean } = {},
	) {
		const returnAll = user.hasGlobalScope('credential:list') && !options.onlyOwn;
		const isDefaultSelect = !options.listQueryOptions?.select;

		if (returnAll) {
			const credentials = await this.credentialsRepository.findMany(options.listQueryOptions);

			return isDefaultSelect
				? credentials.map((c) => this.ownershipService.addOwnedByAndSharedWith(c))
				: credentials;
		}

		const ids = await this.sharedCredentialsRepository.getAccessibleCredentialIds([user.id]);

		const credentials = await this.credentialsRepository.findMany(
			options.listQueryOptions,
			ids, // only accessible credentials
		);

		return isDefaultSelect
			? credentials.map((c) => this.ownershipService.addOwnedByAndSharedWith(c))
			: credentials;
	}

	/**
	 * Retrieve the sharing that matches a user and a credential.
	 */
	async getSharing(
		user: User,
		credentialId: string,
		options: CredentialsGetSharedOptions,
		relations: string[] = ['credentials'],
	): Promise<SharedCredentials | null> {
		const where: FindOptionsWhere<SharedCredentials> = { credentialsId: credentialId };

		// Omit user from where if the requesting user has relevant
		// global credential permissions. This allows the user to
		// access credentials they don't own.
		if (!options.allowGlobalScope || !user.hasGlobalScope(options.globalScope)) {
			where.userId = user.id;
			where.role = 'credential:owner';
		}

		return await this.sharedCredentialsRepository.findOne({ where, relations });
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
		// everytime anybody changes anything on the credentials even if it is just the name.
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

	async save(credential: CredentialsEntity, encryptedData: ICredentialsDb, user: User) {
		// To avoid side effects
		const newCredential = new CredentialsEntity();
		Object.assign(newCredential, credential, encryptedData);

		await this.externalHooks.run('credentials.create', [encryptedData]);

		const result = await Db.transaction(async (transactionManager) => {
			const savedCredential = await transactionManager.save<CredentialsEntity>(newCredential);

			savedCredential.data = newCredential.data;

			const newSharedCredential = new SharedCredentials();

			Object.assign(newSharedCredential, {
				role: 'credential:owner',
				user,
				credentials: savedCredential,
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
}
