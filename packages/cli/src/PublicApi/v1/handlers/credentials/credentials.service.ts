import { FindOneOptions } from 'typeorm';
import { UserSettings, Credentials } from 'n8n-core';
import { IDataObject, INodeProperties } from 'n8n-workflow';
import { Db, ICredentialsDb } from '../../../..';
import { CredentialsEntity } from '../../../../databases/entities/CredentialsEntity';
import { SharedCredentials } from '../../../../databases/entities/SharedCredentials';
import { User } from '../../../../databases/entities/User';
import { CredentialsHelper } from '../../../../CredentialsHelper';

export async function getCredentials(
	credentialId: number | string,
): Promise<ICredentialsDb | undefined> {
	return Db.collections.Credentials.findOne(credentialId);
}

export async function getSharedCredentials(
	userId: string,
	credentialId: number | string,
	relations?: string[],
): Promise<SharedCredentials | undefined> {
	const options: FindOneOptions = {
		where: {
			user: { id: userId },
			credentials: { id: credentialId },
		},
	};

	if (relations) {
		options.relations = relations;
	}

	return Db.collections.SharedCredentials.findOne(options);
}

export async function createCredential(
	properties: Partial<CredentialsEntity>,
): Promise<CredentialsEntity> {
	const newCredential = new CredentialsEntity();

	Object.assign(newCredential, properties);

	if (!newCredential.nodesAccess || newCredential.nodesAccess.length === 0) {
		newCredential.nodesAccess = [
			{
				nodeType: `n8n-nodes-base.${properties.type?.toLowerCase() ?? 'unknown'}`,
				date: new Date(),
			},
		];
	} else {
		// Add the added date for node access permissions
		newCredential.nodesAccess.forEach((nodeAccess) => {
			// eslint-disable-next-line no-param-reassign
			nodeAccess.date = new Date();
		});
	}

	return newCredential;
}

export async function saveCredential(
	credential: CredentialsEntity,
	user: User,
): Promise<CredentialsEntity> {
	const role = await Db.collections.Role.findOneOrFail({
		name: 'owner',
		scope: 'credential',
	});

	return Db.transaction(async (transactionManager) => {
		const savedCredential = await transactionManager.save<CredentialsEntity>(credential);

		savedCredential.data = credential.data;

		const newSharedCredential = new SharedCredentials();

		Object.assign(newSharedCredential, {
			role,
			user,
			credentials: savedCredential,
		});

		await transactionManager.save<SharedCredentials>(newSharedCredential);

		return savedCredential;
	});
}

export async function removeCredential(credentials: CredentialsEntity): Promise<ICredentialsDb> {
	return Db.collections.Credentials.remove(credentials);
}

export async function encryptCredential(credential: CredentialsEntity): Promise<ICredentialsDb> {
	const encryptionKey = await UserSettings.getEncryptionKey();

	// Encrypt the data
	const coreCredential = new Credentials(
		{ id: null, name: credential.name },
		credential.type,
		credential.nodesAccess,
	);

	// @ts-ignore
	coreCredential.setData(credential.data, encryptionKey);

	return coreCredential.getDataToSave() as ICredentialsDb;
}

export function sanitizeCredentials(credentials: CredentialsEntity): Partial<CredentialsEntity>;
export function sanitizeCredentials(
	credentials: CredentialsEntity[],
): Array<Partial<CredentialsEntity>>;

export function sanitizeCredentials(
	credentials: CredentialsEntity | CredentialsEntity[],
): Partial<CredentialsEntity> | Array<Partial<CredentialsEntity>> {
	const argIsArray = Array.isArray(credentials);
	const credentialsList = argIsArray ? credentials : [credentials];

	const sanitizedCredentials = credentialsList.map((credential) => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { data, nodesAccess, shared, ...rest } = credential;
		return rest;
	});

	return argIsArray ? sanitizedCredentials : sanitizedCredentials[0];
}

export function validateCredentialsProperties(type: string, data: IDataObject): string[] {
	const missingProperties: string[] = [];
	const helper = new CredentialsHelper('');
	const credentialsProperties: INodeProperties[] = helper.getCredentialsProperties(type);
	const dataProperties = Object.keys(data);
	const credentialsKeys = credentialsProperties
		// remove hidden types as they do not necessarily have to be defined
		// since they have a default value
		.filter((property) => property.type !== 'hidden')
		.map((property) => property.name);

	credentialsKeys.forEach((key) => {
		if (!dataProperties.includes(key)) {
			missingProperties.push(key);
		}
	});
	return missingProperties;
}
