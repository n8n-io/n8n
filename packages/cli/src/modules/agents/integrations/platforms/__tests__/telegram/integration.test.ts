/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { Mock, Mocked, MockedFunction } from 'vitest';
import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import type { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import type { Author } from 'chat';
import { createHmac } from 'crypto';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError, ConflictError } from '@n8n/errors';
import type { UrlService } from '@n8n/backend-services';

import type { Agent } from '../../../../entities/agent.entity';
import type { AgentRepository } from '../../../../repositories/agent.repository';
import { cancelChannelSetup } from '../../../../utils/agent-channel-setup';
import type { AgentChatIntegrationContext } from '../../../agent-chat-integration';
import { loadTelegramAdapter } from '../../../esm-loader';
import { TelegramIntegration } from '../../telegram-integration';

vi.mock('../../../esm-loader', () => ({
	loadTelegramAdapter: vi.fn(),
}));

const mockedLoadTelegramAdapter = loadTelegramAdapter as MockedFunction<typeof loadTelegramAdapter>;

const expectedSecret = (encryptionKey: string, agentId: string, credentialId: string) =>
	createHmac('sha256', encryptionKey).update(`telegram:${agentId}:${credentialId}`).digest('hex');

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
	integration: {
		type: 'telegram',
		credentialId: 'cred-1',
		settings: { accessMode: 'public', allowedUsers: [] },
	},
	credentialId: 'cred-1',
	credential: { accessToken: 'bot-token' },
	ingressEnabled: true,
	webhookUrlFor: (platform) =>
		`https://n8n.example.com/rest/projects/proj-1/agents/v2/agent-1/webhooks/${platform}`,
	...overrides,
});

const makeIntegration = (
	opts: {
		urlService?: Mocked<UrlService>;
		agentRepository?: Mocked<AgentRepository>;
		encryptionKey?: string;
	} = {},
) => {
	const urlService =
		opts.urlService ??
		(() => {
			const u = mock<UrlService>();
			u.getWebhookBaseUrl.mockReturnValue('https://n8n.example.com/');
			return u;
		})();
	const agentRepository = opts.agentRepository ?? mock<AgentRepository>();
	agentRepository.findByIntegrationCredential.mockResolvedValue([]);
	const credentialsService = mock<CredentialsService>();
	const credentialsRepository = mock<CredentialsRepository>();
	credentialsRepository.updateDataIfUnchanged.mockResolvedValue(true);
	const instanceSettings = mock<InstanceSettings>({
		encryptionKey: opts.encryptionKey ?? 'test-encryption-key',
	});
	const httpClient = mock<HttpRequestClient>();
	const requestMock = httpClient.request as Mock;
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.requests.mockReturnValue(httpClient);
	const integration = new TelegramIntegration(
		mock<Logger>(),
		urlService,
		agentRepository,
		instanceSettings,
		outboundHttp,
		credentialsService,
		credentialsRepository,
	);
	const setupContext = async (overrides: Partial<AgentChatIntegrationContext> = {}) => {
		const ctx = makeContext({ ...overrides, setupAuthorized: true });
		const credential = mock<CredentialsEntity>({
			id: ctx.credentialId,
			name: 'Telegram bot',
			type: 'telegramApi',
			data: 'stored-ciphertext',
		});
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([credential]);
		credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);
		credentialsService.decrypt.mockResolvedValue(ctx.credential as ICredentialDataDecryptedObject);
		credentialsService.createEncryptedData.mockResolvedValue({ data: 'encrypted' } as never);
		await integration.onSetupComplete(ctx);
		ctx.setupAuthorized = false;
		return ctx;
	};
	return {
		integration,
		urlService,
		agentRepository,
		instanceSettings,
		outboundHttp,
		requestMock,
		credentialsService,
		credentialsRepository,
		setupContext,
	};
};

describe('TelegramIntegration capabilities', () => {
	it('exposes message editing', () => {
		const { integration } = makeIntegration();

		expect(integration.actions).toEqual(['respond', 'send_dm', 'edit_message']);
	});
});

describe('TelegramIntegration.validateConfig', () => {
	it('requires Telegram settings', () => {
		const { integration } = makeIntegration();

		expect(() =>
			integration.validateConfig({ type: 'telegram', credentialId: 'credential-1' }),
		).toThrow(BadRequestError);
	});
});

describe('TelegramIntegration.onBeforeConnect', () => {
	let agentRepository: Mocked<AgentRepository>;
	let integration: TelegramIntegration;
	let requestMock: Mock;

	beforeEach(() => {
		const built = makeIntegration();
		integration = built.integration;
		agentRepository = built.agentRepository;
		requestMock = built.requestMock;
	});

	it('restores a locally configured channel without contacting Telegram', async () => {
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		const ctx = makeContext();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(ctx.agentId, 'Agent', [{ type: 'telegram', credentialId: ctx.credentialId }]),
		);

		await expect(integration.onBeforeConnect(ctx)).resolves.toBeUndefined();

		expect(agentRepository.findByIntegrationCredential).toHaveBeenCalledWith(
			'telegram',
			'cred-1',
			'proj-1',
			'agent-1',
		);
		expect(requestMock).not.toHaveBeenCalled();
	});

	it('requires UI setup when the credential has no destination binding', async () => {
		await expect(integration.onBeforeConnect(makeContext())).rejects.toThrow(
			'Complete channel setup',
		);
		expect(requestMock).not.toHaveBeenCalled();
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
		expect(requestMock).not.toHaveBeenCalled();
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

describe('TelegramIntegration destination setup', () => {
	it.each([
		{ accessToken: 'changed-token' },
		{ accessToken: 'bot-token', baseUrl: 'https://other-bot-api.test' },
	])('requires UI setup again when the stored credential changes', async (stored) => {
		const { integration, setupContext, credentialsService, credentialsRepository } =
			makeIntegration();
		const ctx = await setupContext();
		credentialsService.decrypt.mockResolvedValue(stored);
		credentialsService.createEncryptedData.mockClear();
		credentialsRepository.updateDataIfUnchanged.mockClear();

		await expect(integration.onSetupComplete(ctx)).rejects.toThrow('changed during channel setup');

		expect(ctx.credential.accessToken).toBe('bot-token');
		expect(credentialsService.createEncryptedData).not.toHaveBeenCalled();
		expect(credentialsRepository.updateDataIfUnchanged).not.toHaveBeenCalled();
	});

	it('keeps a concurrent credential edit when the setup proof is saved', async () => {
		const { integration, setupContext, credentialsService, credentialsRepository } =
			makeIntegration();
		const ctx = await setupContext();
		credentialsService.decrypt.mockResolvedValue({ accessToken: 'bot-token', note: 'Updated' });
		credentialsRepository.updateDataIfUnchanged.mockClear();
		credentialsRepository.updateDataIfUnchanged.mockResolvedValue(false);

		await expect(integration.onSetupComplete(ctx)).rejects.toThrow('changed during channel setup');

		expect(credentialsRepository.updateDataIfUnchanged).toHaveBeenCalledWith(
			'cred-1',
			'telegramApi',
			'stored-ciphertext',
			'encrypted',
		);
		expect(ctx.credential.note).toBeUndefined();
	});

	it('leaves a failed and canceled UI setup unverified', async () => {
		const { integration, credentialsRepository, requestMock, agentRepository } = makeIntegration();
		const ctx = makeContext({ setupAuthorized: true });
		const agent = makeAgent(ctx.agentId, 'Agent', [ctx.integration]);
		agent.pendingChannelSetup = {
			requested: [{ integration: ctx.integration, setupId: 'pending-setup' }],
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		await integration.onBeforeConnect(ctx);
		requestMock.mockResolvedValue({ statusCode: 500, body: {} });
		await expect(integration.onAfterConnect(ctx)).rejects.toThrow('Failed to register');
		expect(credentialsRepository.updateDataIfUnchanged).not.toHaveBeenCalled();
		Object.assign(agent, cancelChannelSetup(agent, 'pending-setup', 'telegram'));
		ctx.setupAuthorized = false;
		expect(await integration.isDestinationConfigured(ctx)).toBe(false);
		requestMock.mockClear();
		await integration.onBeforeConnect(ctx);
		await integration.onAfterConnect(ctx);
		expect(requestMock).not.toHaveBeenCalled();
	});

	it('records UI setup so a draft can register its webhook on publication', async () => {
		const { integration, setupContext, credentialsService, requestMock } = makeIntegration();
		const ctx = await setupContext();
		expect(requestMock).not.toHaveBeenCalled();
		const savedData = credentialsService.createEncryptedData.mock.calls[0][0].data;
		const published = makeContext({ credential: savedData });
		expect(await integration.isDestinationConfigured(published)).toBe(true);
		requestMock.mockResolvedValue({ statusCode: 200, body: {} });
		await integration.onAfterConnect(published);
		expect(requestMock.mock.calls[0][0].body.url).toBe(ctx.webhookUrlFor('telegram'));
	});

	const destinationChanges: Array<[string, Partial<AgentChatIntegrationContext>]> = [
		['Agent', { agentId: 'other-agent' }],
		['project', { projectId: 'other-project' }],
		['credential', { credentialId: 'other-credential' }],
		['routing', { webhookUrlFor: () => 'https://other-instance.test/telegram' }],
		['bot', { credential: { accessToken: 'other-bot' } }],
		[
			'Bot API',
			{ credential: { accessToken: 'bot-token', baseUrl: 'https://other-bot-api.test' } },
		],
	];
	it.each(destinationChanges)(
		'requires setup again when the %s changes',
		async (_label, change) => {
			const { integration, setupContext, requestMock } = makeIntegration();
			const ctx = await setupContext();
			const changed = { ...ctx, ...change };
			if (change.credential) changed.credential = { ...ctx.credential, ...change.credential };
			expect(await integration.isDestinationConfigured(changed)).toBe(false);
			await expect(integration.onBeforeConnect(changed)).rejects.toThrow('Complete channel setup');
			await integration.onAfterConnect(changed);
			await integration.onBeforeDisconnect(changed);
			expect(requestMock).not.toHaveBeenCalled();
		},
	);

	it.each([undefined, ''])('preserves legacy routing with setup proof %s', async (proof) => {
		const { integration, agentRepository, requestMock } = makeIntegration();
		const ctx = makeContext({
			credential: { accessToken: 'bot-token', agentSetupDestination: proof },
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(ctx.agentId, 'Agent', [{ type: 'telegram', credentialId: ctx.credentialId }]),
		);
		expect(await integration.isDestinationConfigured(ctx)).toBe(false);
		expect(await integration.isDestinationConfigured(ctx, { allowLegacy: true })).toBe(true);
		await integration.onAfterConnect(ctx);
		await integration.onBeforeDisconnect(ctx);
		expect(requestMock).not.toHaveBeenCalled();
	});
});

describe('TelegramIntegration.requiresLeader', () => {
	it('requires the leader in polling mode (localhost / non-public webhook URL)', () => {
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('http://localhost:5678/');

		const { integration } = makeIntegration({ urlService });

		expect(integration.requiresLeader()).toBe(true);
	});

	it('does not require the leader in webhook mode (public HTTPS webhook URL)', () => {
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.example.com/');

		const { integration } = makeIntegration({ urlService });

		expect(integration.requiresLeader()).toBe(false);
	});
});
describe('TelegramIntegration.isUserAllowed', () => {
	const { integration } = makeIntegration();

	it('allows everyone in public mode', () => {
		expect(
			integration.isUserAllowed({ userId: '999', userName: 'someuser' } as Author, {
				type: 'telegram',
				credentialId: 'cred-1',
				settings: {
					accessMode: 'public',
					allowedUsers: [],
				},
			}),
		).toBe(true);
	});

	it('allows everyone for legacy connections without saved settings', () => {
		expect(
			integration.isUserAllowed({ userId: '999', userName: 'someuser' } as Author, undefined),
		).toBe(true);
	});

	it('accepts a whitelisted user by numeric ID in private mode', () => {
		expect(
			integration.isUserAllowed({ userId: '123', userName: 'someuser' } as Author, {
				type: 'telegram',
				credentialId: 'cred-1',
				settings: {
					accessMode: 'private',
					allowedUsers: ['123', '456'],
				},
			}),
		).toBe(true);
	});

	it('accepts a whitelisted user by username in private mode', () => {
		expect(
			integration.isUserAllowed({ userId: '999', userName: 'john_doe123' } as Author, {
				type: 'telegram',
				credentialId: 'cred-1',
				settings: {
					accessMode: 'private',
					allowedUsers: ['john_doe123', '456'],
				},
			}),
		).toBe(true);
	});

	it('rejects a user whose ID and username are both absent from the allowlist', () => {
		expect(
			integration.isUserAllowed({ userId: '999', userName: 'stranger' } as Author, {
				type: 'telegram',
				credentialId: 'cred-1',
				settings: {
					accessMode: 'private',
					allowedUsers: ['123', 'john_doe123'],
				},
			}),
		).toBe(false);
	});

	it('throws UnexpectedError when settings type does not match telegram', () => {
		expect(() =>
			integration.isUserAllowed(
				{ userId: '123', userName: 'user' } as Author,
				{
					type: 'slack',
					accessMode: 'private',
					allowedUsers: ['123'],
				} as never,
			),
		).toThrow();
	});
});

describe('TelegramIntegration.normalizeComponents', () => {
	const { integration } = makeIntegration();

	it('converts select and radio select options to individual buttons', () => {
		expect(
			integration.normalizeComponents([
				{
					type: 'select',
					options: [
						{ label: 'Approve', value: 'approve' },
						{ label: 'Reject', value: 'reject' },
					],
				},
				{
					type: 'radio_select',
					options: [{ label: 'Escalate', value: 'escalate' }],
				},
			]),
		).toEqual([
			{ type: 'button', label: 'Approve', value: 'approve' },
			{ type: 'button', label: 'Reject', value: 'reject' },
			{ type: 'button', label: 'Escalate', value: 'escalate' },
		]);
	});

	it('converts image components to markdown link sections', () => {
		expect(
			integration.normalizeComponents([
				{
					type: 'image',
					url: 'https://example.com/chart.png',
					altText: 'Workflow chart',
				},
			]),
		).toEqual([
			{
				type: 'section',
				text: '[Workflow chart](https://example.com/chart.png)',
			},
		]);
	});

	it('passes supported Telegram components through unchanged', () => {
		const components = [
			{ type: 'section', text: 'Review this change' },
			{ type: 'button', label: 'Approve', value: 'approve', style: 'primary' },
			{ type: 'divider' },
			{ type: 'fields', fields: [{ label: 'Risk', value: 'Low' }] },
		];

		expect(integration.normalizeComponents(components)).toEqual(components);
	});
});

describe('TelegramIntegration secret token', () => {
	const createTelegramAdapter = vi.fn();

	beforeEach(() => {
		createTelegramAdapter.mockReset();
		createTelegramAdapter.mockReturnValue({ marker: 'adapter' });
		mockedLoadTelegramAdapter.mockReset();
		mockedLoadTelegramAdapter.mockResolvedValue({
			createTelegramAdapter,
		} as unknown as Awaited<ReturnType<typeof loadTelegramAdapter>>);
	});

	it('createAdapter passes a deterministic secretToken derived from encryptionKey + agentId + credentialId', async () => {
		const { integration } = makeIntegration({ encryptionKey: 'super-secret-key' });

		await integration.createAdapter(makeContext({ agentId: 'A', credentialId: 'C' }));

		const expected = expectedSecret('super-secret-key', 'A', 'C');
		expect(createTelegramAdapter).toHaveBeenCalledWith({
			botToken: 'bot-token',
			mode: 'webhook',
			secretToken: expected,
		});
	});

	it('createAdapter uses polling for ingress-enabled local connections', async () => {
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('http://localhost:5678/');
		const { integration } = makeIntegration({ urlService });

		await integration.createAdapter(makeContext());

		expect(createTelegramAdapter).toHaveBeenCalledWith(
			expect.objectContaining({ mode: 'polling', longPolling: { deleteWebhook: false } }),
		);
	});

	it('allows UI setup to prepare a local polling channel', async () => {
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('http://localhost:5678/');
		const { integration, setupContext } = makeIntegration({ urlService });
		await integration.createAdapter(await setupContext());
		expect(createTelegramAdapter).toHaveBeenCalledWith(
			expect.objectContaining({ mode: 'polling', longPolling: { deleteWebhook: true } }),
		);
	});

	it('createAdapter forces webhook mode for ingress-disabled local connections', async () => {
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('http://localhost:5678/');
		const { integration } = makeIntegration({ urlService });

		await integration.createAdapter(makeContext({ ingressEnabled: false }));

		expect(createTelegramAdapter).toHaveBeenCalledWith(
			expect.objectContaining({ mode: 'webhook' }),
		);
	});

	it('two service instances configured with the same encryption key produce identical secrets — the multi-main invariant', async () => {
		const a = makeIntegration({ encryptionKey: 'shared-cluster-key' });
		const b = makeIntegration({ encryptionKey: 'shared-cluster-key' });

		await a.integration.createAdapter(makeContext({ agentId: 'agent-X', credentialId: 'cred-Y' }));
		await b.integration.createAdapter(makeContext({ agentId: 'agent-X', credentialId: 'cred-Y' }));

		const firstSecret = createTelegramAdapter.mock.calls[0][0].secretToken;
		const secondSecret = createTelegramAdapter.mock.calls[1][0].secretToken;
		expect(firstSecret).toBe(secondSecret);
	});

	it('different (agentId, credentialId) pairs produce different secrets', async () => {
		const { integration } = makeIntegration({ encryptionKey: 'k' });

		await integration.createAdapter(makeContext({ agentId: 'A', credentialId: 'C1' }));
		await integration.createAdapter(makeContext({ agentId: 'A', credentialId: 'C2' }));

		expect(createTelegramAdapter.mock.calls[0][0].secretToken).not.toBe(
			createTelegramAdapter.mock.calls[1][0].secretToken,
		);
	});

	it('onAfterConnect sends secret_token to Telegram matching the secret used by the adapter', async () => {
		const { integration, requestMock, setupContext } = makeIntegration({
			encryptionKey: 'cluster-key',
		});
		requestMock.mockResolvedValue({ statusCode: 200, body: {} });

		await integration.onAfterConnect(
			await setupContext({ agentId: 'agent-Z', credentialId: 'cred-Z' }),
		);

		expect(requestMock).toHaveBeenCalledTimes(1);
		const request = requestMock.mock.calls[0][0] as {
			url: string;
			body: { url: string; secret_token: string };
		};
		expect(request.url).toBe('https://api.telegram.org/botbot-token/setWebhook');
		expect(request.body.url).toBe(
			'https://n8n.example.com/rest/projects/proj-1/agents/v2/agent-1/webhooks/telegram',
		);
		expect(request.body.secret_token).toBe(expectedSecret('cluster-key', 'agent-Z', 'cred-Z'));
	});

	it('onAfterConnect uses the default safe client (user-configurable Bot API host)', async () => {
		const { integration, requestMock, outboundHttp, setupContext } = makeIntegration();
		requestMock.mockResolvedValue({ statusCode: 200, body: {} });

		await integration.onAfterConnect(await setupContext());

		expect(outboundHttp.requests).toHaveBeenCalledWith();
	});

	it('onAfterConnect throws when Telegram rejects setWebhook', async () => {
		const { integration, requestMock, setupContext } = makeIntegration();
		requestMock.mockResolvedValue({ statusCode: 400, body: 'bad request' });

		await expect(integration.onAfterConnect(await setupContext())).rejects.toThrow(
			'Failed to register Telegram webhook: bad request',
		);
	});

	it('onAfterConnect honors a custom baseUrl from the credential (self-hosted Bot API)', async () => {
		const { integration, requestMock, setupContext } = makeIntegration();
		requestMock.mockResolvedValue({ statusCode: 200, body: {} });

		await integration.onAfterConnect(
			await setupContext({
				credential: {
					accessToken: 'bot-token',
					baseUrl: 'https://bot-api.self-hosted.example.com/',
				},
			}),
		);

		const request = requestMock.mock.calls[0][0] as { url: string };
		expect(request.url).toBe('https://bot-api.self-hosted.example.com/botbot-token/setWebhook');
	});
});

describe('TelegramIntegration.onBeforeDisconnect', () => {
	it('calls deleteWebhook on Telegram with the bot token in webhook mode', async () => {
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.example.com/');
		const { integration, requestMock, setupContext } = makeIntegration({ urlService });
		requestMock.mockResolvedValue({ statusCode: 200, body: {} });

		await integration.onBeforeDisconnect(await setupContext());

		expect(requestMock).toHaveBeenCalledTimes(1);
		const request = requestMock.mock.calls[0][0] as { url: string; method: string };
		expect(request.url).toBe('https://api.telegram.org/botbot-token/deleteWebhook');
		expect(request.method).toBe('POST');
	});

	it('skips the API call entirely in polling mode (localhost / non-public URL)', async () => {
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('http://localhost:5678/');
		const { integration, requestMock } = makeIntegration({ urlService });

		await integration.onBeforeDisconnect(makeContext());

		expect(requestMock).not.toHaveBeenCalled();
	});

	it('throws when Telegram rejects deleteWebhook so the caller can log it', async () => {
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.example.com/');
		const { integration, requestMock, setupContext } = makeIntegration({ urlService });
		requestMock.mockResolvedValue({ statusCode: 401, body: 'invalid token' });

		await expect(integration.onBeforeDisconnect(await setupContext())).rejects.toThrow(
			'Failed to deregister Telegram webhook: invalid token',
		);
	});

	it('honors a custom baseUrl from the credential (self-hosted Bot API)', async () => {
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.example.com/');
		const { integration, requestMock, setupContext } = makeIntegration({ urlService });
		requestMock.mockResolvedValue({ statusCode: 200, body: {} });

		await integration.onBeforeDisconnect(
			await setupContext({
				credential: {
					accessToken: 'bot-token',
					baseUrl: 'https://bot-api.self-hosted.example.com',
				},
			}),
		);

		const request = requestMock.mock.calls[0][0] as { url: string };
		expect(request.url).toBe('https://bot-api.self-hosted.example.com/botbot-token/deleteWebhook');
	});
});
