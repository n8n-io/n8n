import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { User } from '@db/entities/User';
import type { Role } from '@db/entities/Role';
import type { ICredentialsDb } from '@/Interfaces';
import { RoleService } from '@/services/role.service';
import type { CredentialPayload } from '../types';
import Container from 'typedi';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';

async function encryptCredentialData(credential: CredentialsEntity) {
	const { createCredentialsFromCredentialsEntity } = await import('@/CredentialsHelper');
	const coreCredential = createCredentialsFromCredentialsEntity(credential, true);

	// @ts-ignore
	coreCredential.setData(credential.data);

	return coreCredential.getDataToSave() as ICredentialsDb;
}

/**
 * Save a credential to the test DB, sharing it with a user.
 */
export async function saveCredential(
	credentialPayload: CredentialPayload,
	{ user, role }: { user: User; role: Role },
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
	const role = await Container.get(RoleService).findCredentialUserRole();
	const newSharedCredentials = users.map((user) =>
		Container.get(SharedCredentialsRepository).create({
			userId: user.id,
			credentialsId: credential.id,
			roleId: role?.id,
		}),
	);
	return await Container.get(SharedCredentialsRepository).save(newSharedCredentials);
}

export function affixRoleToSaveCredential(role: Role) {
	return async (credentialPayload: CredentialPayload, { user }: { user: User }) =>
		await saveCredential(credentialPayload, { user, role });
}

export async function getAllCredentials() {
	return await Container.get(CredentialsRepository).find();
}

export const getCredentialById = async (id: string) =>
	await Container.get(CredentialsRepository).findOneBy({ id });
