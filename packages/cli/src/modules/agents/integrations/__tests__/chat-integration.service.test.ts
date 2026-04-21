/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import type { UrlService } from '@/services/url.service';

import type { Agent } from '../../entities/agent.entity';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { ChatIntegrationRegistry } from '../agent-chat-integration';
import { ChatIntegrationService } from '../chat-integration.service';

interface PrivateSurface {
	ensureTelegramCredentialAvailable(
		agentId: string,
		credentialId: string,
		projectId: string,
		decryptedData: Record<string, unknown>,
	): Promise<void>;
}

const asPrivate = (s: ChatIntegrationService): PrivateSurface => s as unknown as PrivateSurface;

const makeAgent = (
	id: string,
	name: string,
	integrations: Array<{ type: string; credentialId: string }>,
) => ({ id, name, integrations }) as Agent;

describe('ChatIntegrationService — Telegram credential conflict detection', () => {
	let service: ChatIntegrationService;
	let agentRepository: jest.Mocked<AgentRepository>;
	let urlService: jest.Mocked<UrlService>;
	let fetchSpy: jest.SpyInstance;

	beforeEach(() => {
		agentRepository = mock<AgentRepository>();
		urlService = mock<UrlService>();
		urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
		urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.example.com/');

		service = new ChatIntegrationService(
			mock<Logger>(),
			agentRepository,
			mock<CredentialsService>(),
			mock<CredentialsFinderService>(),
			urlService,
			mock<ChatIntegrationRegistry>(),
		);

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

		await expect(
			asPrivate(service).ensureTelegramCredentialAvailable('agent-1', 'cred-1', 'proj-1', {
				accessToken: 'bot-token',
			}),
		).resolves.toBeUndefined();

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

		await expect(
			asPrivate(service).ensureTelegramCredentialAvailable('agent-1', 'cred-1', 'proj-1', {
				accessToken: 'bot-token',
			}),
		).resolves.toBeUndefined();
	});

	it('throws ConflictError naming the owning agent when DB has another claimant', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([
			makeAgent('agent-other', 'Agent Other', [{ type: 'telegram', credentialId: 'cred-1' }]),
		]);

		await expect(
			asPrivate(service).ensureTelegramCredentialAvailable('agent-1', 'cred-1', 'proj-1', {
				accessToken: 'bot-token',
			}),
		).rejects.toThrow(
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

		await expect(
			asPrivate(service).ensureTelegramCredentialAvailable('agent-1', 'cred-1', 'proj-1', {
				accessToken: 'bot-token',
			}),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it('fails open (no throw) when getWebhookInfo itself errors out', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		fetchSpy.mockRejectedValue(new Error('network down'));

		await expect(
			asPrivate(service).ensureTelegramCredentialAvailable('agent-1', 'cred-1', 'proj-1', {
				accessToken: 'bot-token',
			}),
		).resolves.toBeUndefined();
	});

	it('skips the Telegram API probe when instance is in polling mode', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		urlService.getWebhookBaseUrl.mockReturnValue('http://localhost:5678/');

		await asPrivate(service).ensureTelegramCredentialAvailable('agent-1', 'cred-1', 'proj-1', {
			accessToken: 'bot-token',
		});

		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('names the first conflicting agent when multiple agents share the credential', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([
			makeAgent('agent-a', 'Alpha', [{ type: 'telegram', credentialId: 'cred-1' }]),
			makeAgent('agent-b', 'Beta', [{ type: 'telegram', credentialId: 'cred-1' }]),
		]);

		await expect(
			asPrivate(service).ensureTelegramCredentialAvailable('agent-1', 'cred-1', 'proj-1', {
				accessToken: 'bot-token',
			}),
		).rejects.toThrow(
			new ConflictError('Telegram credential is already connected to agent "Alpha"'),
		);
	});

	it('fails open when getWebhookInfo returns a non-2xx response', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		fetchSpy.mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

		await expect(
			asPrivate(service).ensureTelegramCredentialAvailable('agent-1', 'cred-1', 'proj-1', {
				accessToken: 'bot-token',
			}),
		).resolves.toBeUndefined();
	});

	it('fails open when getWebhookInfo returns malformed JSON', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		fetchSpy.mockResolvedValue(new Response('not json', { status: 200 }));

		await expect(
			asPrivate(service).ensureTelegramCredentialAvailable('agent-1', 'cred-1', 'proj-1', {
				accessToken: 'bot-token',
			}),
		).resolves.toBeUndefined();
	});

	it('does not probe Telegram when the credential payload lacks an accessToken', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);

		await asPrivate(service).ensureTelegramCredentialAvailable('agent-1', 'cred-1', 'proj-1', {
			// no accessToken — Telegram probe should be skipped, no conflict raised
			other: 'data',
		});

		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
