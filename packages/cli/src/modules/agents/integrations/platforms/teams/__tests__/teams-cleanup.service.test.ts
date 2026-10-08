import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentCredentialLookupService } from '../../../agent-credential-lookup.service';
import { TeamsCleanupService } from '../teams-cleanup.service';

const user = mock<User>({ id: 'user-1' });
const ctx = { user, projectId: 'project-1', credentialId: 'bot-cred-1' };

describe('TeamsCleanupService', () => {
	let credentialLookup: ReturnType<typeof mock<AgentCredentialLookupService>>;
	let service: TeamsCleanupService;

	beforeEach(() => {
		credentialLookup = mock<AgentCredentialLookupService>();
		service = new TeamsCleanupService(credentialLookup);
		credentialLookup.decryptForUser.mockResolvedValue({
			entraAppObjectId: 'object-1',
			clientId: 'app-1',
		} as never);
	});

	it('names what was left behind and where to remove it', async () => {
		await expect(service.describeLeftovers(ctx)).resolves.toEqual({
			integrationType: 'teams',
			code: 'resources_not_deleted',
			action: { type: 'open_url', url: expect.stringContaining('entra.microsoft.com') },
			details: { appId: 'app-1' },
		});
	});

	it('says nothing about a credential the user made themselves', async () => {
		credentialLookup.decryptForUser.mockResolvedValue({ clientId: 'app-1' } as never);

		await expect(service.describeLeftovers(ctx)).resolves.toBeUndefined();
	});

	it('says nothing when the credential cannot be read', async () => {
		credentialLookup.decryptForUser.mockResolvedValue(null as never);

		await expect(service.describeLeftovers(ctx)).resolves.toBeUndefined();
	});

	it('says nothing for a draft channel with no credential', async () => {
		await expect(service.describeLeftovers({ ...ctx, credentialId: '' })).resolves.toBeUndefined();
		expect(credentialLookup.decryptForUser).not.toHaveBeenCalled();
	});

	/**
	 * A global credential is visible to the project whoever asks, so the read has
	 * to go through the disconnecting user rather than the project alone.
	 */
	it('reads the credential as the user who is disconnecting', async () => {
		await service.describeLeftovers(ctx);

		expect(credentialLookup.decryptForUser).toHaveBeenCalledWith(
			user,
			'project-1',
			'bot-cred-1',
			'microsoftEntraServicePrincipalApi',
		);
		expect(credentialLookup.decryptForProject).not.toHaveBeenCalled();
	});
});
