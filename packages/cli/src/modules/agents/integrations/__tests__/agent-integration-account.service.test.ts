import type { Logger } from '@n8n/backend-common';
import type { CacheService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentChatIntegration, ChatIntegrationRegistry } from '../agent-chat-integration';
import type { AgentCredentialLookupService } from '../agent-credential-lookup.service';
import { AgentIntegrationAccountService } from '../agent-integration-account.service';

const PROJECT_ID = 'project-1';
const CREDENTIAL_ID = 'cred-1';
const user = mock<User>({ id: 'user-1' });

describe('AgentIntegrationAccountService', () => {
	const logger = mock<Logger>();
	const cacheService = mock<CacheService>();
	const registry = mock<ChatIntegrationRegistry>();
	const credentialLookup = mock<AgentCredentialLookupService>();
	const describeAccount = vi.fn();
	let integration: AgentChatIntegration;
	let service: AgentIntegrationAccountService;

	beforeEach(() => {
		vi.clearAllMocks();
		describeAccount.mockReset();
		integration = mock<AgentChatIntegration>({
			type: 'slack',
			credentialTypes: ['slackOAuth2Api', 'slackApi'],
			describeAccount,
		});
		registry.get.mockReturnValue(integration);
		registry.require.mockReturnValue(integration);
		cacheService.get.mockResolvedValue(undefined);
		cacheService.set.mockResolvedValue(undefined);
		service = new AgentIntegrationAccountService(logger, cacheService, registry, credentialLookup);
	});

	async function requestAccount() {
		return await service.describe({
			user,
			projectId: PROJECT_ID,
			type: 'slack',
			credentialId: CREDENTIAL_ID,
		});
	}

	it('returns a cached account without calling the platform', async () => {
		cacheService.get.mockResolvedValue({ botName: 'cached-bot' });

		await expect(requestAccount()).resolves.toEqual({ botName: 'cached-bot' });

		expect(credentialLookup.decryptForUser).not.toHaveBeenCalled();
		expect(describeAccount).not.toHaveBeenCalled();
		expect(cacheService.get).toHaveBeenCalledWith(
			`agent-integration-account:${user.id}:${PROJECT_ID}:slack:${CREDENTIAL_ID}`,
		);
	});

	it('tries each credential type until one decrypts, then caches the result', async () => {
		credentialLookup.decryptForUser
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ accessToken: 'token' });
		describeAccount.mockResolvedValue({ botName: 'bot', workspaceNames: ['Acme'] });

		await expect(requestAccount()).resolves.toEqual({ botName: 'bot', workspaceNames: ['Acme'] });

		expect(credentialLookup.decryptForUser).toHaveBeenNthCalledWith(
			1,
			user,
			PROJECT_ID,
			CREDENTIAL_ID,
			'slackOAuth2Api',
		);
		expect(credentialLookup.decryptForUser).toHaveBeenNthCalledWith(
			2,
			user,
			PROJECT_ID,
			CREDENTIAL_ID,
			'slackApi',
		);
		expect(describeAccount).toHaveBeenCalledWith({ accessToken: 'token' });
		expect(cacheService.set).toHaveBeenCalledWith(
			expect.any(String),
			{ botName: 'bot', workspaceNames: ['Acme'] },
			10 * 60 * 1000,
		);
	});

	it('returns an empty account when no credential type decrypts', async () => {
		credentialLookup.decryptForUser.mockResolvedValue(null);

		await expect(requestAccount()).resolves.toEqual({});

		expect(describeAccount).not.toHaveBeenCalled();
		expect(cacheService.set).toHaveBeenCalledWith(expect.any(String), {}, 60 * 1000);
	});

	it('logs a failed lookup and returns an empty account', async () => {
		credentialLookup.decryptForUser.mockResolvedValue({ accessToken: 'token' });
		describeAccount.mockRejectedValue(new TypeError('response body with secret'));

		await expect(requestAccount()).resolves.toEqual({});

		expect(logger.debug).toHaveBeenCalledWith(expect.any(String), {
			type: 'slack',
			credentialId: CREDENTIAL_ID,
			error: 'TypeError',
		});
	});

	it('returns an empty account for an integration without account lookup', async () => {
		registry.get.mockReturnValue(undefined);

		await expect(requestAccount()).resolves.toEqual({});

		expect(cacheService.get).not.toHaveBeenCalled();
	});
});
