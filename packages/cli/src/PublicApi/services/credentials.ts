import { FindOneOptions } from 'typeorm';
import { Db, ICredentialsDb } from '../..';
import { CredentialsEntity } from '../../databases/entities/CredentialsEntity';
import { SharedCredentials } from '../../databases/entities/SharedCredentials';

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

export async function removeCredential(credentials: CredentialsEntity): Promise<ICredentialsDb> {
	return Db.collections.Credentials.remove(credentials);
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
		const { data, nodesAccess, ...rest } = credential;
		return rest;
	});

	return argIsArray ? sanitizedCredentials : sanitizedCredentials[0];
}
