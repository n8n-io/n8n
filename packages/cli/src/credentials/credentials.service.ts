/* eslint-disable no-restricted-syntax */
/* eslint-disable import/no-cycle */
import { Credentials, UserSettings } from 'n8n-core';
import { ICredentialDataDecryptedObject, LoggerProxy } from 'n8n-workflow';
import { FindOneOptions } from 'typeorm';
import { clone } from 'lodash';

import { createCredentialsFromCredentialsEntity, Db, ICredentialsDb, ResponseHelper } from '..';
import { RESPONSE_ERROR_MESSAGES } from '../constants';
import { CredentialsEntity } from '../databases/entities/CredentialsEntity';
import { SharedCredentials } from '../databases/entities/SharedCredentials';
import { User } from '../databases/entities/User';
import { validateEntity } from '../GenericHelpers';
import { CredentialRequest } from '../requests';
import { externalHooks } from '../Server';

export class CredentialsService {
	static async getSharedCredentials(
		user: User,
		credentialId: number | string,
		relations?: string[],
	): Promise<SharedCredentials | undefined> {
		const options: FindOneOptions = {
			where: {
				credentials: { id: credentialId },
			},
		};

		if (user.globalRole.name !== 'owner') {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			options.where.user = { id: user.id };
		}

		if (relations) {
			options.relations = relations;
		}

		return Db.collections.SharedCredentials.findOne(options);
	}

	static createCredentialsFromCredentialsEntity(
		credential: CredentialsEntity,
		encrypt = false,
	): Credentials {
		const { id, name, type, nodesAccess, data } = credential;
		if (encrypt) {
			return new Credentials({ id: null, name }, type, nodesAccess);
		}
		return new Credentials({ id: id.toString(), name }, type, nodesAccess, data);
	}

	static async prepareCredentialsCreateData(
		data: CredentialRequest.RequestBody,
	): Promise<CredentialsEntity> {
		// Make a copy so we can delete the provided ID
		const dataCopy = clone(data);
		delete dataCopy.id;

		const newCredentials = new CredentialsEntity();
		Object.assign(newCredentials, dataCopy);

		await validateEntity(newCredentials);

		// Add the date for newly added node access permissions
		for (const nodeAccess of newCredentials.nodesAccess) {
			nodeAccess.date = new Date();
		}

		return newCredentials;
	}

	static async prepareCredentialsUpdateData(
		data: CredentialRequest.RequestBody,
		decryptedData: ICredentialDataDecryptedObject,
	): Promise<CredentialsEntity> {
		const updateData = new CredentialsEntity();
		Object.assign(updateData, data);

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

	static createEncryptedCredentialsData(
		encryptionKey: string,
		credentialsId: string | null,
		data: CredentialsEntity,
	): ICredentialsDb {
		const credentials = new Credentials(
			{ id: credentialsId, name: data.name },
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
		let encryptionKey: string;
		try {
			encryptionKey = await UserSettings.getEncryptionKey();
		} catch (error) {
			throw new ResponseHelper.ResponseError(
				RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY,
				undefined,
				500,
			);
		}
		return encryptionKey;
	}

	static async decryptCredential(
		encryptionKey: string,
		credential: CredentialsEntity,
	): Promise<ICredentialDataDecryptedObject> {
		const coreCredential = createCredentialsFromCredentialsEntity(credential);
		return coreCredential.getData(encryptionKey);
	}

	static async updateCredentials(
		credentialId: string,
		newCredentialData: ICredentialsDb,
	): Promise<ICredentialsDb | undefined> {
		await externalHooks.run('credentials.update', [newCredentialData]);

		// Update the credentials in DB
		await Db.collections.Credentials.update(credentialId, newCredentialData);

		// We sadly get nothing back from "update". Neither if it updated a record
		// nor the new value. So query now the updated entry.
		return Db.collections.Credentials.findOne(credentialId);
	}

	static async saveCredentials(
		credential: CredentialsEntity,
		encryptedData: ICredentialsDb,
		user: User,
	): Promise<CredentialsEntity> {
		// To avoid side effects
		const newCredential = new CredentialsEntity();
		Object.assign(newCredential, credential);

		Object.assign(newCredential, encryptedData);

		await externalHooks.run('credentials.create', [encryptedData]);

		const role = await Db.collections.Role.findOneOrFail({
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
}
