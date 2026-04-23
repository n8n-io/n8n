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

	it('passes through when no other agent uses the credential and Telegram reports no webhook', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		fetchSpy.mockResolvedValue(
			new Response(JSON.stringify({ result: { url: '' } }), { status: 200 }),
		);

		await expect(integration.onBeforeConnect(makeContext())).resolves.toBeUndefined();

		expect(agentRepository.findByIntegrationCredential).toHaveBeenCalledWith(
			'telegram',
			'cred-1',
			'proj-1',
			'agent-1',
		);
	});

	it('passes through when Telegram reports our own webhook URL (idempotent reconnect)', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		const ourUrl =
			'https://n8n.example.com/rest/projects/proj-1/agents/v2/agent-1/webhooks/telegram';
		fetchSpy.mockResolvedValue(
			new Response(JSON.stringify({ result: { url: ourUrl } }), { status: 200 }),
		);

		await expect(integration.onBeforeConnect(makeContext())).resolves.toBeUndefined();
	});

	it('throws ConflictError naming the owning agent when DB has another claimant', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([
			makeAgent('agent-other', 'Agent Other', [{ type: 'telegram', credentialId: 'cred-1' }]),
		]);

		await expect(integration.onBeforeConnect(makeContext())).rejects.toThrow(
			new ConflictError('Telegram credential is already connected to agent "Agent Other"'),
		);
		// Telegram API must not be called once the DB already indicates a conflict.
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('throws ConflictError when Telegram reports a foreign webhook URL and no DB owner', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		const foreignUrl = 'https://some-other-host.example/telegram';
		fetchSpy.mockResolvedValue(
			new Response(JSON.stringify({ result: { url: foreignUrl } }), { status: 200 }),
		);

		await expect(integration.onBeforeConnect(makeContext())).rejects.toBeInstanceOf(ConflictError);
	});

	it('fails open (no throw) when getWebhookInfo itself errors out', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		fetchSpy.mockRejectedValue(new Error('network down'));

		await expect(integration.onBeforeConnect(makeContext())).resolves.toBeUndefined();
	});

	it('skips the Telegram API probe when instance is in polling mode', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		urlService.getWebhookBaseUrl.mockReturnValue('http://localhost:5678/');

		await integration.onBeforeConnect(makeContext());

		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('names the first conflicting agent when multiple agents share the credential', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([
			makeAgent('agent-a', 'Alpha', [{ type: 'telegram', credentialId: 'cred-1' }]),
			makeAgent('agent-b', 'Beta', [{ type: 'telegram', credentialId: 'cred-1' }]),
		]);

		await expect(integration.onBeforeConnect(makeContext())).rejects.toThrow(
			new ConflictError('Telegram credential is already connected to agent "Alpha"'),
		);
	});

	it('fails open when getWebhookInfo returns a non-2xx response', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		fetchSpy.mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

		await expect(integration.onBeforeConnect(makeContext())).resolves.toBeUndefined();
	});

	it('fails open when getWebhookInfo returns malformed JSON', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		fetchSpy.mockResolvedValue(new Response('not json', { status: 200 }));

		await expect(integration.onBeforeConnect(makeContext())).resolves.toBeUndefined();
	});

	it('does not probe Telegram when the credential payload lacks an accessToken', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);

		await integration.onBeforeConnect(makeContext({ credential: { other: 'data' } }));

		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
