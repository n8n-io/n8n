import type { CredentialPayload } from '@n8n/backend-test-utils';
import type { Project, User, ICredentialsDb } from '@n8n/db';
import { CredentialsEntity, CredentialsRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { CredentialSharingRole } from '@n8n/permissions';

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
	const credentialData = {
		...attributes,
		...(project && { projectId: project.id }),
	};
	const credentials = await credentialsRepository.save(
		credentialsRepository.create(credentialData),
	);

	return credentials;
}

/**
 * Save a credential to the test DB, associating it with a user or project.
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
	const newCredential = new CredentialsEntity();

	Object.assign(newCredential, credentialPayload);

	await encryptCredentialData(newCredential);

	if ('user' in options) {
		const user = options.user;
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			user.id,
		);
		newCredential.projectId = personalProject.id;
	} else {
		const project = options.project;
		newCredential.projectId = project.id;
	}

	const savedCredential = await Container.get(CredentialsRepository).save(newCredential);
	savedCredential.data = newCredential.data;

	return savedCredential;
}

/**
 * @deprecated In the new architecture, credentials belong to a single project.
 * Use project membership to control access instead.
 * This function is kept for backward compatibility in tests but does nothing.
 */
export async function shareCredentialWithUsers(credential: CredentialsEntity, users: User[]) {
	// In the new architecture, credentials belong to a single project.
	// Users gain access through project membership, not through SharedCredentials.
	// This function is now a no-op for backward compatibility.
	return [];
}

/**
 * @deprecated In the new architecture, credentials belong to a single project.
 * Use project membership to control access instead.
 * This function is kept for backward compatibility in tests but does nothing.
 */
export async function shareCredentialWithProjects(
	credential: CredentialsEntity,
	projects: Project[],
) {
	// In the new architecture, credentials belong to a single project.
	// To "share" a credential with a project, the credential must be created
	// with that project's ID from the start.
	// This function is now a no-op for backward compatibility.
	return [];
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

/**
 * @deprecated SharedCredentials table no longer exists.
 * Use credentials with project relations instead.
 */
export async function getAllSharedCredentials() {
	// SharedCredentials no longer exists. Return empty array for backward compatibility.
	return [];
}

/**
 * @deprecated SharedCredentials table no longer exists.
 * Credentials belong directly to projects via projectId.
 */
export async function getCredentialSharings(credential: CredentialsEntity) {
	// SharedCredentials no longer exists. Return empty array for backward compatibility.
	return [];
}
