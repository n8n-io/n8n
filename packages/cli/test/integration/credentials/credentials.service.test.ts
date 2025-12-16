import {
	createTeamProject,
	linkUserToProject,
	randomCredentialPayload,
	testDb,
} from '@n8n/backend-test-utils';
import type { CredentialsEntity, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';

import { saveCredential, shareCredentialWithUsers } from '../shared/db/credentials';
import { createMember } from '../shared/db/users';

const credentialPayload = randomCredentialPayload();
let memberWhoOwnsCredential: User;
let memberWhoDoesNotOwnCredential: User;
let credential: CredentialsEntity;

beforeAll(async () => {
	await testDb.init();

	memberWhoOwnsCredential = await createMember();
	memberWhoDoesNotOwnCredential = await createMember();
	credential = await saveCredential(credentialPayload, {
		user: memberWhoOwnsCredential,
		role: 'credential:owner',
	});

	await shareCredentialWithUsers(credential, [memberWhoDoesNotOwnCredential]);
});

describe('credentials service', () => {
	describe('replaceCredentialContentsForSharee', () => {
		it('should replace the contents of the credential for sharee', async () => {
			const storedCredential = await Container.get(CredentialsFinderService).findCredentialForUser(
				credential.id,
				memberWhoDoesNotOwnCredential,
				['credential:read'],
			);

			const decryptedData = Container.get(CredentialsService).decrypt(storedCredential!);

			const mergedCredentials = {
				id: credential.id,
				name: credential.name,
				type: credential.type,
				data: { accessToken: '' },
			};

			await Container.get(CredentialsService).replaceCredentialContentsForSharee(
				memberWhoDoesNotOwnCredential,
				storedCredential!,
				decryptedData,
				mergedCredentials,
			);

			expect(mergedCredentials.data).toEqual({ accessToken: credentialPayload.data.accessToken });
		});

		it('should replace the contents of the credential for project viewer', async () => {
			const [project, viewerMember] = await Promise.all([createTeamProject(), createMember()]);
			await linkUserToProject(viewerMember, project, 'project:viewer');
			const projectCredential = await saveCredential(credentialPayload, {
				project,
				role: 'credential:owner',
			});

			const storedProjectCredential = await Container.get(
				CredentialsFinderService,
			).findCredentialForUser(projectCredential.id, viewerMember, ['credential:read']);

			if (!storedProjectCredential) throw new Error('Could not find credential');

			const decryptedData = Container.get(CredentialsService).decrypt(storedProjectCredential);

			const mergedCredentials = {
				id: projectCredential.id,
				name: projectCredential.name,
				type: projectCredential.type,
				data: { accessToken: '' },
			};

			await Container.get(CredentialsService).replaceCredentialContentsForSharee(
				viewerMember,
				storedProjectCredential,
				decryptedData,
				mergedCredentials,
			);

			expect(mergedCredentials.data).toEqual({ accessToken: credentialPayload.data.accessToken });
		});

		it('should not replace the contents of the credential for project editor', async () => {
			const [project, editorMember] = await Promise.all([createTeamProject(), createMember()]);
			await linkUserToProject(editorMember, project, 'project:editor');
			const projectCredential = await saveCredential(credentialPayload, {
				project,
				role: 'credential:owner',
			});

			const storedProjectCredential = await Container.get(
				CredentialsFinderService,
			).findCredentialForUser(projectCredential.id, editorMember, ['credential:read']);

			if (!storedProjectCredential) throw new Error('Could not find credential');

			const decryptedData = Container.get(CredentialsService).decrypt(storedProjectCredential);

			const originalData = { accessToken: '' };
			const mergedCredentials = {
				id: projectCredential.id,
				name: projectCredential.name,
				type: projectCredential.type,
				data: originalData,
			};

			await Container.get(CredentialsService).replaceCredentialContentsForSharee(
				editorMember,
				storedProjectCredential,
				decryptedData,
				mergedCredentials,
			);

			expect(mergedCredentials.data).toBe(originalData);
		});
	});
});
