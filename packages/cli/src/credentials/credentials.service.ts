/* eslint-disable no-restricted-syntax */
/* eslint-disable import/no-cycle */
import { Credentials, UserSettings } from 'n8n-core';
import { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { FindOneOptions } from 'typeorm';

import { createCredentialsFromCredentialsEntity, Db, ICredentialsDb, ResponseHelper } from '..';
import { RESPONSE_ERROR_MESSAGES } from '../constants';
import { CredentialsEntity } from '../databases/entities/CredentialsEntity';
import { SharedCredentials } from '../databases/entities/SharedCredentials';
import { User } from '../databases/entities/User';
import { validateEntity } from '../GenericHelpers';
import { CredentialRequest } from '../requests';

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

	static createEncryptedCredentials(
		encryptionKey: string,
		credentialsId: string,
		updateData: CredentialsEntity,
	): ICredentialsDb {
		const credentials = new Credentials(
			{ id: credentialsId, name: updateData.name },
			updateData.type,
			updateData.nodesAccess,
		);

		credentials.setData(
			updateData.data as unknown as ICredentialDataDecryptedObject,
			encryptionKey,
		);

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
		// Update the credentials in DB
		await Db.collections.Credentials.update(credentialId, newCredentialData);

		// We sadly get nothing back from "update". Neither if it updated a record
		// nor the new value. So query now the updated entry.
		return Db.collections.Credentials.findOne(credentialId);
	}
}
