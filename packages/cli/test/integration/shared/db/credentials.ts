import { Container } from '@n8n/di';

import { CredentialsEntity } from '@/databases/entities/credentials-entity';
import type { Project } from '@/databases/entities/project';
import type { CredentialSharingRole } from '@/databases/entities/shared-credentials';
import type { User } from '@/databases/entities/user';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import type { ICredentialsDb } from '@/interfaces';

import type { CredentialPayload } from '../types';

export async function encryptCredentialData(
	credential: CredentialsEntity,
): Promise<ICredentialsDb> {
	const { createCredentialsFromCredentialsEntity } = await import('@/credentials-helper');
	const coreCredential = createCredentialsFromCredentialsEntity(credential, true);

	// @ts-ignore
	coreCredential.setData(credential.data);

	return Object.assign(credential, coreCredential.getDataToSave());
}

export async function decryptCredentialData(credential: ICredentialsDb): Promise<unknown> {
	const { createCredentialsFromCredentialsEntity } = await import('@/credentials-helper');
	const coreCredential = createCredentialsFromCredentialsEntity(credential);

	return coreCredential.getData();
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

export async function createCredentials(
	attributes: Partial<CredentialsEntity> = emptyAttributes,
	project?: Project,
) {
	const credentialsRepository = Container.get(CredentialsRepository);
	const credentials = await credentialsRepository.save(credentialsRepository.create(attributes));

	if (project) {
		await Container.get(SharedCredentialsRepository).save(
			Container.get(SharedCredentialsRepository).create({
				project,
				credentials,
				role: 'credential:owner',
			}),
		);
	}

	return credentials;
}

/**
 * Save a credential to the test DB, sharing it with a user.
 */
export async function saveCredential(
	credentialPayload: CredentialPayload,
	options:
		| { user: User; role: CredentialSharingRole }
		| {
				project: Project;
				role: CredentialSharingRole;
		  },
) {
	const role = options.role;
	const newCredential = new CredentialsEntity();

	Object.assign(newCredential, credentialPayload);

	await encryptCredentialData(newCredential);

	const savedCredential = await Container.get(CredentialsRepository).save(newCredential);

	savedCredential.data = newCredential.data;

	if ('user' in options) {
		const user = options.user;
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			user.id,
		);

		await Container.get(SharedCredentialsRepository).save({
			user,
			credentials: savedCredential,
			role,
			project: personalProject,
		});
	} else {
		const project = options.project;

		await Container.get(SharedCredentialsRepository).save({
			credentials: savedCredential,
			role,
			project,
		});
	}

	return savedCredential;
}

export async function shareCredentialWithUsers(credential: CredentialsEntity, users: User[]) {
	const newSharedCredentials = await Promise.all(
		users.map(async (user) => {
			const personalProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(user.id);

			return Container.get(SharedCredentialsRepository).create({
				credentialsId: credential.id,
				role: 'credential:user',
				projectId: personalProject.id,
			});
		}),
	);

	return await Container.get(SharedCredentialsRepository).save(newSharedCredentials);
}

export async function shareCredentialWithProjects(
	credential: CredentialsEntity,
	projects: Project[],
) {
	const newSharedCredentials = await Promise.all(
		projects.map(async (project) => {
			return Container.get(SharedCredentialsRepository).create({
				credentialsId: credential.id,
				role: 'credential:user',
				projectId: project.id,
			});
		}),
	);

	return await Container.get(SharedCredentialsRepository).save(newSharedCredentials);
}

export function affixRoleToSaveCredential(role: CredentialSharingRole) {
	return async (
		credentialPayload: CredentialPayload,
		options: { user: User } | { project: Project },
	) => await saveCredential(credentialPayload, { ...options, role });
}

export async function getAllCredentials() {
	return await Container.get(CredentialsRepository).find();
}

export const getCredentialById = async (id: string) =>
	await Container.get(CredentialsRepository).findOneBy({ id });

export async function getAllSharedCredentials() {
	return await Container.get(SharedCredentialsRepository).find();
}

export async function getCredentialSharings(credential: CredentialsEntity) {
	return await Container.get(SharedCredentialsRepository).findBy({
		credentialsId: credential.id,
	});
}
