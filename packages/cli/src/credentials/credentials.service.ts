/* eslint-disable no-restricted-syntax */
import { Credentials, UserSettings } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialType,
	INodeCredentialTestResult,
	INodeProperties,
} from 'n8n-workflow';
import { deepCopy, LoggerProxy, NodeHelpers } from 'n8n-workflow';
import type { FindManyOptions, FindOptionsWhere } from 'typeorm';
import { In } from 'typeorm';

import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import type { ICredentialsDb } from '@/Interfaces';
import { CredentialsHelper, createCredentialsFromCredentialsEntity } from '@/CredentialsHelper';
import { CREDENTIAL_BLANKING_VALUE, RESPONSE_ERROR_MESSAGES } from '@/constants';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import { validateEntity } from '@/GenericHelpers';
import { ExternalHooks } from '@/ExternalHooks';

import type { User } from '@db/entities/User';
import type { CredentialRequest } from '@/requests';
import { CredentialTypes } from '@/CredentialTypes';
import { Container } from 'typedi';

export class CredentialsService {
	static async get(
		where: FindOptionsWhere<ICredentialsDb>,
		options?: { relations: string[] },
	): Promise<ICredentialsDb | null> {
		return Db.collections.Credentials.findOne({
			relations: options?.relations,
			where,
		});
	}

	static async getAll(
		user: User,
		options?: { relations?: string[]; roles?: string[]; disableGlobalRole?: boolean },
	): Promise<ICredentialsDb[]> {
		const SELECT_FIELDS: Array<keyof ICredentialsDb> = [
			'id',
			'name',
			'type',
			'nodesAccess',
			'createdAt',
			'updatedAt',
		];

		// if instance owner, return all credentials

		if (user.globalRole.name === 'owner' && options?.disableGlobalRole !== true) {
			return Db.collections.Credentials.find({
				select: SELECT_FIELDS,
				relations: options?.relations,
			});
		}

		// if member, return credentials owned by or shared with member
		const userSharings = await Db.collections.SharedCredentials.find({
			where: {
				userId: user.id,
				...(options?.roles?.length ? { role: { name: In(options.roles) } } : {}),
			},
			relations: options?.roles?.length ? ['role'] : [],
		});

		return Db.collections.Credentials.find({
			select: SELECT_FIELDS,
			relations: options?.relations,
			where: {
				id: In(userSharings.map((x) => x.credentialsId)),
			},
		});
	}

	static async getMany(filter: FindManyOptions<ICredentialsDb>): Promise<ICredentialsDb[]> {
		return Db.collections.Credentials.find(filter);
	}

	/**
	 * Retrieve the sharing that matches a user and a credential.
	 */
	static async getSharing(
		user: User,
		credentialId: string,
		relations: string[] = ['credentials'],
		{ allowGlobalOwner } = { allowGlobalOwner: true },
	): Promise<SharedCredentials | null> {
		const where: FindOptionsWhere<SharedCredentials> = { credentialsId: credentialId };

		// Omit user from where if the requesting user is the global
		// owner. This allows the global owner to view and delete
		// credentials they don't own.
		if (!allowGlobalOwner || user.globalRole.name !== 'owner') {
			Object.assign(where, {
				userId: user.id,
				role: { name: 'owner' },
			});
			if (!relations.includes('role')) {
				relations.push('role');
			}
		}

		return Db.collections.SharedCredentials.findOne({ where, relations });
	}

	static async prepareCreateData(
		data: CredentialRequest.CredentialProperties,
	): Promise<CredentialsEntity> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { id, ...rest } = data;

		// This saves us a merge but requires some type casting. These
		// types are compatible for this case.
		const newCredentials = Db.collections.Credentials.create(
			rest as ICredentialsDb,
		) as CredentialsEntity;

		await validateEntity(newCredentials);

		// Add the date for newly added node access permissions
		for (const nodeAccess of newCredentials.nodesAccess) {
			nodeAccess.date = new Date();
		}

		return newCredentials;
	}

	static async prepareUpdateData(
		data: CredentialRequest.CredentialProperties,
		decryptedData: ICredentialDataDecryptedObject,
	): Promise<CredentialsEntity> {
		const mergedData = deepCopy(data);
		if (mergedData.data) {
			mergedData.data = this.unredact(mergedData.data, decryptedData);
		}

		// This saves us a merge but requires some type casting. These
		// types are compatiable for this case.
		const updateData = Db.collections.Credentials.create(
			mergedData as ICredentialsDb,
		) as CredentialsEntity;

		await validateEntity(updateData);

		// Add the date for newly added node access permissions
		for (const nodeAccess of updateData.nodesAccess) {
			if (!nodeAccess.date) {
				nodeAccess.date = new Date();
			}
		}

		// Do not overwrite the oauth data else data like the access or refresh token would get lost
		// everytime anybody changes anything on the credentials even if it is just the name.
		if (decryptedData.oauthTokenData) {
			// @ts-ignore
			updateData.data.oauthTokenData = decryptedData.oauthTokenData;
		}
		return updateData;
	}

	static createEncryptedData(
		encryptionKey: string,
		credentialId: string | null,
		data: CredentialsEntity,
	): ICredentialsDb {
		const credentials = new Credentials(
			{ id: credentialId, name: data.name },
			data.type,
			data.nodesAccess,
		);

		credentials.setData(data.data as unknown as ICredentialDataDecryptedObject, encryptionKey);

		const newCredentialData = credentials.getDataToSave() as ICredentialsDb;

		// Add special database related data
		newCredentialData.updatedAt = new Date();

		return newCredentialData;
	}

	static async getEncryptionKey(): Promise<string> {
		try {
			return await UserSettings.getEncryptionKey();
		} catch (error) {
			throw new ResponseHelper.InternalServerError(RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY);
		}
	}

	static async decrypt(
		encryptionKey: string,
		credential: CredentialsEntity,
	): Promise<ICredentialDataDecryptedObject> {
		const coreCredential = createCredentialsFromCredentialsEntity(credential);
		const data = coreCredential.getData(encryptionKey);

		return data;
	}

	static async update(
		credentialId: string,
		newCredentialData: ICredentialsDb,
	): Promise<ICredentialsDb | null> {
		await Container.get(ExternalHooks).run('credentials.update', [newCredentialData]);

		// Update the credentials in DB
		await Db.collections.Credentials.update(credentialId, newCredentialData);

		// We sadly get nothing back from "update". Neither if it updated a record
		// nor the new value. So query now the updated entry.
		return Db.collections.Credentials.findOneBy({ id: credentialId });
	}

	static async save(
		credential: CredentialsEntity,
		encryptedData: ICredentialsDb,
		user: User,
	): Promise<CredentialsEntity> {
		// To avoid side effects
		const newCredential = new CredentialsEntity();
		Object.assign(newCredential, credential, encryptedData);

		await Container.get(ExternalHooks).run('credentials.create', [encryptedData]);

		const role = await Db.collections.Role.findOneByOrFail({
			name: 'owner',
			scope: 'credential',
		});

		const result = await Db.transaction(async (transactionManager) => {
			const savedCredential = await transactionManager.save<CredentialsEntity>(newCredential);

			savedCredential.data = newCredential.data;

			const newSharedCredential = new SharedCredentials();

			Object.assign(newSharedCredential, {
				role,
				user,
				credentials: savedCredential,
			});

			await transactionManager.save<SharedCredentials>(newSharedCredential);

			return savedCredential;
		});
		LoggerProxy.verbose('New credential created', {
			credentialId: newCredential.id,
			ownerId: user.id,
		});
		return result;
	}

	static async delete(credentials: CredentialsEntity): Promise<void> {
		await Container.get(ExternalHooks).run('credentials.delete', [credentials.id]);

		await Db.collections.Credentials.remove(credentials);
	}

	static async test(
		user: User,
		encryptionKey: string,
		credentials: ICredentialsDecrypted,
	): Promise<INodeCredentialTestResult> {
		const helper = new CredentialsHelper(encryptionKey);

		return helper.testCredentials(user, credentials.type, credentials);
	}

	// Take data and replace all sensitive values with a sentinel value.
	// This will replace password fields and oauth data.
	static redact(
		data: ICredentialDataDecryptedObject,
		credential: CredentialsEntity,
	): ICredentialDataDecryptedObject {
		const copiedData = deepCopy(data);

		const credTypes = Container.get(CredentialTypes);
		let credType: ICredentialType;
		try {
			credType = credTypes.getByName(credential.type);
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
				const extendsType = credTypes.getByName(e);
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
				copiedData[dataKey] = CREDENTIAL_BLANKING_VALUE;
				continue;
			}
			const prop = properties.find((v) => v.name === dataKey);
			if (!prop) {
				continue;
			}
			if (prop.typeOptions?.password) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				copiedData[dataKey] = CREDENTIAL_BLANKING_VALUE;
			}
		}

		return copiedData;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private static unredactRestoreValues(unmerged: any, replacement: any) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		for (const [key, value] of Object.entries(unmerged)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (value === CREDENTIAL_BLANKING_VALUE) {
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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
				this.unredactRestoreValues(value, replacement[key]);
			}
		}
	}

	// Take unredacted data (probably from the DB) and merge it with
	// redacted data to create an unredacted version.
	static unredact(
		redactedData: ICredentialDataDecryptedObject,
		savedData: ICredentialDataDecryptedObject,
	): ICredentialDataDecryptedObject {
		// Replace any blank sentinel values with their saved version
		const mergedData = deepCopy(redactedData);
		this.unredactRestoreValues(mergedData, savedData);
		return mergedData;
	}
}
