/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { Logger } from '@n8n/backend-common';
import { createHmac } from 'crypto';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import type { UrlService } from '@/services/url.service';

import type { Agent } from '../../../entities/agent.entity';
import type { AgentRepository } from '../../../repositories/agent.repository';
import type { AgentChatIntegrationContext } from '../../agent-chat-integration';
import { loadTelegramAdapter } from '../../esm-loader';
import { TelegramIntegration } from '../telegram-integration';
import type { Author } from 'chat';

jest.mock('../../esm-loader', () => ({
	loadTelegramAdapter: jest.fn(),
}));

const mockedLoadTelegramAdapter = loadTelegramAdapter as jest.MockedFunction<
	typeof loadTelegramAdapter
>;

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
	credentialId: 'cred-1',
	credential: { accessToken: 'bot-token' },
	webhookUrlFor: (platform) =>
		`https://n8n.example.com/rest/projects/proj-1/agents/v2/agent-1/webhooks/${platform}`,
	...overrides,
});

const makeIntegration = (
	opts: {
		urlService?: jest.Mocked<UrlService>;
		agentRepository?: jest.Mocked<AgentRepository>;
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
	const instanceSettings = mock<InstanceSettings>({
		encryptionKey: opts.encryptionKey ?? 'test-encryption-key',
	});
	const integration = new TelegramIntegration(
		mock<Logger>(),
		urlService,
		agentRepository,
		instanceSettings,
	);
	return { integration, urlService, agentRepository, instanceSettings };
};

describe('TelegramIntegration.onBeforeConnect', () => {
	let agentRepository: jest.Mocked<AgentRepository>;
	let integration: TelegramIntegration;
	let fetchSpy: jest.SpyInstance;

	beforeEach(() => {
		const built = makeIntegration();
		integration = built.integration;
		agentRepository = built.agentRepository;

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

describe('TelegramIntegration secret token', () => {
	const createTelegramAdapter = jest.fn();

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
		const fetchSpy = jest
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue({ ok: true, text: async () => 'ok' } as Response);

		try {
			const { integration } = makeIntegration({ encryptionKey: 'cluster-key' });

			await integration.onAfterConnect(makeContext({ agentId: 'agent-Z', credentialId: 'cred-Z' }));

			expect(fetchSpy).toHaveBeenCalledTimes(1);
			const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
			expect(url).toBe('https://api.telegram.org/botbot-token/setWebhook');
			const body = JSON.parse(init.body as string) as { url: string; secret_token: string };
			expect(body.url).toBe(
				'https://n8n.example.com/rest/projects/proj-1/agents/v2/agent-1/webhooks/telegram',
			);
			expect(body.secret_token).toBe(expectedSecret('cluster-key', 'agent-Z', 'cred-Z'));
		} finally {
			fetchSpy.mockRestore();
		}
	});
});
