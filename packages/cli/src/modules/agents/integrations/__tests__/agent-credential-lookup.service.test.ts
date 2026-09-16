import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import { AgentCredentialLookupService } from '../agent-credential-lookup.service';

const PROJECT_ID = 'project-1';
const CREDENTIAL_ID = 'cred-1';
const TYPE = 'microsoftEntraServicePrincipalApi';

describe('AgentCredentialLookupService', () => {
	let credentialsService: ReturnType<typeof mock<CredentialsService>>;
	let service: AgentCredentialLookupService;

	beforeEach(() => {
		credentialsService = mock<CredentialsService>();
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([]);
		credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);
		credentialsService.decrypt.mockResolvedValue({ clientId: 'a-client' });
		service = new AgentCredentialLookupService(credentialsService);
	});

	it('finds a credential belonging to the project', async () => {
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
			mock({ id: CREDENTIAL_ID, type: TYPE }),
		]);

		expect(await service.decryptForProject(PROJECT_ID, CREDENTIAL_ID, TYPE)).toEqual({
			clientId: 'a-client',
		});
	});

	it('finds a credential shared globally rather than through the project', async () => {
		credentialsService.findAllGlobalCredentialIds.mockResolvedValue([
			mock({ id: CREDENTIAL_ID, type: TYPE }),
		]);

		expect(await service.decryptForProject(PROJECT_ID, CREDENTIAL_ID, TYPE)).toEqual({
			clientId: 'a-client',
		});
	});

	it('leaves the global credentials unread when the project already has it', async () => {
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
			mock({ id: CREDENTIAL_ID, type: TYPE }),
		]);

		await service.decryptForProject(PROJECT_ID, CREDENTIAL_ID, TYPE);

		// The global query reads every global credential, data column included.
		expect(credentialsService.findAllGlobalCredentialIds).not.toHaveBeenCalled();
	});

	it('refuses a credential of another type', async () => {
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
			mock({ id: CREDENTIAL_ID, type: 'slackApi' }),
		]);

		expect(await service.decryptForProject(PROJECT_ID, CREDENTIAL_ID, TYPE)).toBeNull();
		expect(credentialsService.decrypt).not.toHaveBeenCalled();
	});

	it('refuses a credential visible to neither', async () => {
		expect(await service.decryptForProject(PROJECT_ID, CREDENTIAL_ID, TYPE)).toBeNull();
		expect(credentialsService.decrypt).not.toHaveBeenCalled();
	});
});
