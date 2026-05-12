/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import type { UrlService } from '@/services/url.service';

import type { Agent } from '../../../entities/agent.entity';
import type { AgentRepository } from '../../../repositories/agent.repository';
import type { AgentChatIntegrationContext } from '../../agent-chat-integration';
import { TelegramIntegration } from '../telegram-integration';

const makeAgent = (
	id: string,
	name: string,
	integrations: Array<{ type: string; credentialId: string }>,
) => ({ id, name, integrations }) as Agent;

const makeContext = (
	overrides: Partial<AgentChatIntegrationContext> = {},
): AgentChatIntegrationContext => ({
	agentId: 'agent-1',
	projectId: 'proj-1',
	credentialId: 'cred-1',
	credential: { accessToken: 'bot-token' },
	webhookUrlFor: (platform) =>
		`https://n8n.example.com/rest/projects/proj-1/agents/v2/agent-1/webhooks/${platform}`,
	...overrides,
});

describe('TelegramIntegration.onBeforeConnect', () => {
	let integration: TelegramIntegration;
	let agentRepository: jest.Mocked<AgentRepository>;
	let urlService: jest.Mocked<UrlService>;
	let fetchSpy: jest.SpyInstance;

	beforeEach(() => {
		agentRepository = mock<AgentRepository>();
		urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.example.com/');

		integration = new TelegramIntegration(mock<Logger>(), urlService, agentRepository);

		fetchSpy = jest.spyOn(globalThis, 'fetch');
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it('passes through when no other agent uses the credential', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);

		await expect(integration.onBeforeConnect(makeContext())).resolves.toBeUndefined();

		expect(agentRepository.findByIntegrationCredential).toHaveBeenCalledWith(
			'telegram',
			'cred-1',
			'proj-1',
			'agent-1',
		);
		// onBeforeConnect must not call Telegram — the connect flow overwrites
		// any leftover webhook in onAfterConnect, so probing here would just
		// burn an API call and risk false-positive conflicts.
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('throws ConflictError naming the owning agent when DB has another claimant', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([
			makeAgent('agent-other', 'Agent Other', [{ type: 'telegram', credentialId: 'cred-1' }]),
		]);

		const promise = integration.onBeforeConnect(makeContext());
		await expect(promise).rejects.toThrow(ConflictError);
		await expect(promise).rejects.toThrow(
			'Telegram credential is already connected to agent "Agent Other"',
		);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('names the first conflicting agent when multiple agents share the credential', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([
			makeAgent('agent-a', 'Alpha', [{ type: 'telegram', credentialId: 'cred-1' }]),
			makeAgent('agent-b', 'Beta', [{ type: 'telegram', credentialId: 'cred-1' }]),
		]);

		const promise = integration.onBeforeConnect(makeContext());
		await expect(promise).rejects.toThrow(ConflictError);
		await expect(promise).rejects.toThrow(
			'Telegram credential is already connected to agent "Alpha"',
		);
	});
});

describe('TelegramIntegration.requiresLeader', () => {
	it('requires the leader in polling mode (localhost / non-public webhook URL)', () => {
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('http://localhost:5678/');

		const integration = new TelegramIntegration(
			mock<Logger>(),
			urlService,
			mock<AgentRepository>(),
		);

		expect(integration.requiresLeader()).toBe(true);
	});

	it('does not require the leader in webhook mode (public HTTPS webhook URL)', () => {
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.example.com/');

		const integration = new TelegramIntegration(
			mock<Logger>(),
			urlService,
			mock<AgentRepository>(),
		);

		expect(integration.requiresLeader()).toBe(false);
	});
});
