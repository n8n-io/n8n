import { Container } from 'typedi';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { User } from '@db/entities/User';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import type { CredentialSharingRole } from '@db/entities/SharedCredentials';
import type { ICredentialsDb } from '@/Interfaces';
import type { CredentialPayload } from '../types';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import type { Project } from '@/databases/entities/Project';
import { UserRepository } from '@/databases/repositories/user.repository';

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
	nodesAccess: [],
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

	const encryptedData = await encryptCredentialData(newCredential);

	Object.assign(newCredential, encryptedData);

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
		// TODO: remove this when we remove users from SharedWorkflow
		const user = await Container.get(UserRepository).findOneByOrFail({
			projectRelations: { projectId: project.id },
		});

		await Container.get(SharedCredentialsRepository).save({
			user,
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
