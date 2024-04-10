import { Container } from 'typedi';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { User } from '@db/entities/User';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import type { CredentialSharingRole } from '@db/entities/SharedCredentials';
import type { ICredentialsDb } from '@/Interfaces';
import type { CredentialPayload } from '../types';

async function encryptCredentialData(credential: CredentialsEntity) {
	const { createCredentialsFromCredentialsEntity } = await import('@/CredentialsHelper');
	const coreCredential = createCredentialsFromCredentialsEntity(credential, true);

	// @ts-ignore
	coreCredential.setData(credential.data);

	return coreCredential.getDataToSave() as ICredentialsDb;
}

const emptyAttributes = {
	name: 'test',
	type: 'test',
	data: '',
};

export async function createManyCredentials(
	amount: number,
	attributes: Partial<CredentialsEntity> = emptyAttributes,
) {
	return await Promise.all(
		Array(amount)
			.fill(0)
			.map(async () => await createCredentials(attributes)),
	);
}

export async function createCredentials(attributes: Partial<CredentialsEntity> = emptyAttributes) {
	const credentialsRepository = Container.get(CredentialsRepository);
	const entity = credentialsRepository.create(attributes);

	return await credentialsRepository.save(entity);
}

/**
 * Save a credential to the test DB, sharing it with a user.
 */
export async function saveCredential(
	credentialPayload: CredentialPayload,
	{ user, role }: { user: User; role: CredentialSharingRole },
) {
	const newCredential = new CredentialsEntity();

	Object.assign(newCredential, credentialPayload);

	const encryptedData = await encryptCredentialData(newCredential);

	Object.assign(newCredential, encryptedData);

	const savedCredential = await Container.get(CredentialsRepository).save(newCredential);

	savedCredential.data = newCredential.data;

	await Container.get(SharedCredentialsRepository).save({
		user,
		credentials: savedCredential,
		role,
	});

	return savedCredential;
}

export async function shareCredentialWithUsers(credential: CredentialsEntity, users: User[]) {
	const newSharedCredentials = users.map((user) =>
		Container.get(SharedCredentialsRepository).create({
			userId: user.id,
			credentialsId: credential.id,
			role: 'credential:user',
		}),
	);
	return await Container.get(SharedCredentialsRepository).save(newSharedCredentials);
}

export function affixRoleToSaveCredential(role: CredentialSharingRole) {
	return async (credentialPayload: CredentialPayload, { user }: { user: User }) =>
		await saveCredential(credentialPayload, { user, role });
}

export async function getAllCredentials() {
	return await Container.get(CredentialsRepository).find();
}

export const getCredentialById = async (id: string) =>
	await Container.get(CredentialsRepository).findOneBy({ id });

export async function getAllSharedCredentials() {
	return await Container.get(SharedCredentialsRepository).find();
}
