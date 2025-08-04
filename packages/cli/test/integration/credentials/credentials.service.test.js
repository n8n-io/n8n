'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const credentials_finder_service_1 = require('@/credentials/credentials-finder.service');
const credentials_service_1 = require('@/credentials/credentials.service');
const credentials_1 = require('../shared/db/credentials');
const users_1 = require('../shared/db/users');
const credentialPayload = (0, backend_test_utils_1.randomCredentialPayload)();
let memberWhoOwnsCredential;
let memberWhoDoesNotOwnCredential;
let credential;
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	memberWhoOwnsCredential = await (0, users_1.createMember)();
	memberWhoDoesNotOwnCredential = await (0, users_1.createMember)();
	credential = await (0, credentials_1.saveCredential)(credentialPayload, {
		user: memberWhoOwnsCredential,
		role: 'credential:owner',
	});
	await (0, credentials_1.shareCredentialWithUsers)(credential, [memberWhoDoesNotOwnCredential]);
});
describe('credentials service', () => {
	describe('replaceCredentialContentsForSharee', () => {
		it('should replace the contents of the credential for sharee', async () => {
			const storedCredential = await di_1.Container.get(
				credentials_finder_service_1.CredentialsFinderService,
			).findCredentialForUser(credential.id, memberWhoDoesNotOwnCredential, ['credential:read']);
			const decryptedData = di_1.Container.get(credentials_service_1.CredentialsService).decrypt(
				storedCredential,
			);
			const mergedCredentials = {
				id: credential.id,
				name: credential.name,
				type: credential.type,
				data: { accessToken: '' },
			};
			await di_1.Container.get(
				credentials_service_1.CredentialsService,
			).replaceCredentialContentsForSharee(
				memberWhoDoesNotOwnCredential,
				storedCredential,
				decryptedData,
				mergedCredentials,
			);
			expect(mergedCredentials.data).toEqual({ accessToken: credentialPayload.data.accessToken });
		});
		it('should replace the contents of the credential for project viewer', async () => {
			const [project, viewerMember] = await Promise.all([
				(0, backend_test_utils_1.createTeamProject)(),
				(0, users_1.createMember)(),
			]);
			await (0, backend_test_utils_1.linkUserToProject)(viewerMember, project, 'project:viewer');
			const projectCredential = await (0, credentials_1.saveCredential)(credentialPayload, {
				project,
				role: 'credential:owner',
			});
			const storedProjectCredential = await di_1.Container.get(
				credentials_finder_service_1.CredentialsFinderService,
			).findCredentialForUser(projectCredential.id, viewerMember, ['credential:read']);
			if (!storedProjectCredential) throw new Error('Could not find credential');
			const decryptedData = di_1.Container.get(credentials_service_1.CredentialsService).decrypt(
				storedProjectCredential,
			);
			const mergedCredentials = {
				id: projectCredential.id,
				name: projectCredential.name,
				type: projectCredential.type,
				data: { accessToken: '' },
			};
			await di_1.Container.get(
				credentials_service_1.CredentialsService,
			).replaceCredentialContentsForSharee(
				viewerMember,
				storedProjectCredential,
				decryptedData,
				mergedCredentials,
			);
			expect(mergedCredentials.data).toEqual({ accessToken: credentialPayload.data.accessToken });
		});
		it('should not replace the contents of the credential for project editor', async () => {
			const [project, editorMember] = await Promise.all([
				(0, backend_test_utils_1.createTeamProject)(),
				(0, users_1.createMember)(),
			]);
			await (0, backend_test_utils_1.linkUserToProject)(editorMember, project, 'project:editor');
			const projectCredential = await (0, credentials_1.saveCredential)(credentialPayload, {
				project,
				role: 'credential:owner',
			});
			const storedProjectCredential = await di_1.Container.get(
				credentials_finder_service_1.CredentialsFinderService,
			).findCredentialForUser(projectCredential.id, editorMember, ['credential:read']);
			if (!storedProjectCredential) throw new Error('Could not find credential');
			const decryptedData = di_1.Container.get(credentials_service_1.CredentialsService).decrypt(
				storedProjectCredential,
			);
			const originalData = { accessToken: '' };
			const mergedCredentials = {
				id: projectCredential.id,
				name: projectCredential.name,
				type: projectCredential.type,
				data: originalData,
			};
			await di_1.Container.get(
				credentials_service_1.CredentialsService,
			).replaceCredentialContentsForSharee(
				editorMember,
				storedProjectCredential,
				decryptedData,
				mergedCredentials,
			);
			expect(mergedCredentials.data).toBe(originalData);
		});
	});
});
//# sourceMappingURL=credentials.service.test.js.map
