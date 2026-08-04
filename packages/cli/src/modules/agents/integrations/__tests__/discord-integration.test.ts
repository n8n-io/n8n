import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';

import type { Agent } from '../../entities/agent.entity';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { AgentChatIntegrationContext } from '../agent-chat-integration';
import type { ChatInstance } from '../chat-integration.service';
import type { PlatformContextQueryParams } from '../agent-chat-integration';
import { DiscordIntegration } from '../platforms/discord-integration';
import { installFetchStub } from './helpers/replay-test-helpers';

// The chat SDK + adapters are ESM-only. Production loads them via esm-loader's
// `new Function()` hack to dodge the CJS transform, which can't run under vitest;
// redirect the loader to a native dynamic import so `createAdapter` works here.
vi.mock('../esm-loader', () => ({
	loadDiscordAdapter: async () => await import('@chat-adapter/discord'),
}));

const AGENT_ID = 'agent-1';
const CREDENTIAL_ID = 'cred-discord';
const GUILD_ID = '800000000000000001';
const APPLICATION_ID = '900000000000000001';
const PUBLIC_KEY = 'a'.repeat(64);
const BOT_TOKEN = 'test-bot-token';

function connectionContext(
	overrides: Partial<AgentChatIntegrationContext> = {},
): AgentChatIntegrationContext {
	return {
		agentId: AGENT_ID,
		projectId: 'project-1',
		credentialId: CREDENTIAL_ID,
		credential: {
			botToken: BOT_TOKEN,
			publicKey: PUBLIC_KEY,
			applicationId: APPLICATION_ID,
		},
		webhookUrlFor: () => 'https://n8n.example.com/webhook',
		...overrides,
	};
}

function searchQuery(): PlatformContextQueryParams {
	return {
		chat: undefined,
		descriptor: {
			agentId: AGENT_ID,
			integration: { type: 'discord', credentialId: CREDENTIAL_ID },
		},
		query: 'search_channels',
		input: { query: 'general' },
	} as unknown as PlatformContextQueryParams;
}

describe('DiscordIntegration', () => {
	let integration: DiscordIntegration;
	let agentRepository: ReturnType<typeof mock<AgentRepository>>;
	let logger: ReturnType<typeof mock<Logger>>;

	beforeEach(() => {
		agentRepository = mock<AgentRepository>();
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		logger = mock<Logger>();
		integration = new DiscordIntegration(
			logger,
			mock<InstanceSettings>({ isLeader: false }),
			agentRepository,
		);
	});

	it('extracts the Discord bot user ID for bridge message context', () => {
		const chat = {
			getAdapter: vi.fn().mockReturnValue({ botUserId: '1234567890' }),
		} as unknown as ChatInstance;

		expect(integration.getPlatformAgentContext(chat)).toEqual({ agentUserId: '1234567890' });
		expect(chat.getAdapter).toHaveBeenCalledWith('discord');
	});

	it('strips the bot self-mention in both the plain and legacy nickname form', () => {
		const context = { agentUserId: '1234567890' };

		expect(integration.prepareInboundText('<@1234567890> what is the status?', context)).toBe(
			'what is the status?',
		);
		expect(integration.prepareInboundText('<@!1234567890> what is the status?', context)).toBe(
			'what is the status?',
		);
		expect(integration.prepareInboundText('hey <@1234567890> ping', context)).toBe('hey ping');
	});

	it('leaves other users and role mentions intact', () => {
		const context = { agentUserId: '1234567890' };

		expect(integration.prepareInboundText('<@9999999999> ask <@1234567890>', context)).toBe(
			'<@9999999999> ask',
		);
		// `<@&id>` is a role mention; the bot's own role must not be stripped as if
		// it were the bot user, since role IDs and user IDs share a namespace.
		expect(integration.prepareInboundText('<@&1234567890> hello', context)).toBe(
			'<@&1234567890> hello',
		);
	});

	it('returns the text untouched when the bot user ID is unknown', () => {
		expect(integration.prepareInboundText('<@1234567890> hello', {})).toBe('<@1234567890> hello');
	});

	describe('onBeforeConnect', () => {
		let stub: ReturnType<typeof installFetchStub>;
		let applicationCalls: number;

		beforeEach(() => {
			applicationCalls = 0;
			stub = installFetchStub({
				match: /discord\.com\/api/,
				onRequest: ({ url }) => {
					const path = new URL(url).pathname.replace(/^\/api\/v\d+/, '');
					const apiCall = { method: path, body: {} };
					if (path === '/oauth2/applications/@me') {
						applicationCalls += 1;
						return {
							apiCall,
							responseBody: { id: APPLICATION_ID, verify_key: PUBLIC_KEY },
						};
					}
					return { apiCall, responseBody: {} };
				},
			});
		});

		afterEach(() => {
			stub?.restore();
		});

		it('allows connect when Discord metadata matches the credential', async () => {
			await expect(integration.onBeforeConnect(connectionContext())).resolves.toBeUndefined();
			expect(applicationCalls).toBe(1);
		});

		it('rejects when Discord returns 401 for the bot token', async () => {
			stub.restore();
			stub = installFetchStub({
				match: /discord\.com\/api/,
				onRequest: () => ({
					apiCall: { method: '/oauth2/applications/@me', body: {} },
					responseBody: { message: '401: Unauthorized' },
					status: 401,
				}),
			});

			const promise = integration.onBeforeConnect(connectionContext());
			await expect(promise).rejects.toBeInstanceOf(BadRequestError);
			await expect(promise).rejects.toThrow(/Bot Token was rejected/);
		});

		it('rejects when the Application ID does not match Discord metadata', async () => {
			stub.restore();
			stub = installFetchStub({
				match: /discord\.com\/api/,
				onRequest: () => ({
					apiCall: { method: '/oauth2/applications/@me', body: {} },
					responseBody: { id: '111111111111111111', verify_key: PUBLIC_KEY },
				}),
			});

			await expect(integration.onBeforeConnect(connectionContext())).rejects.toThrow(
				/Application ID does not match/,
			);
		});

		it('rejects when the Public Key does not match Discord metadata', async () => {
			stub.restore();
			stub = installFetchStub({
				match: /discord\.com\/api/,
				onRequest: () => ({
					apiCall: { method: '/oauth2/applications/@me', body: {} },
					responseBody: { id: APPLICATION_ID, verify_key: 'b'.repeat(64) },
				}),
			});

			await expect(integration.onBeforeConnect(connectionContext())).rejects.toThrow(
				/Public Key does not match/,
			);
		});

		it('rejects repository ownership before calling Discord', async () => {
			agentRepository.findByIntegrationCredential.mockResolvedValue([
				{ id: 'agent-other', name: 'Other Agent' } as Agent,
			]);

			const promise = integration.onBeforeConnect(connectionContext());
			await expect(promise).rejects.toBeInstanceOf(ConflictError);
			await expect(promise).rejects.toThrow(
				'Discord credential is already connected to agent "Other Agent"',
			);
			expect(applicationCalls).toBe(0);
		});
	});

	describe('createAdapter logger', () => {
		it('forwards adapter initialization through the n8n logger without metadata', async () => {
			const adapter = (await integration.createAdapter(connectionContext())) as {
				initialize: (chat: unknown) => Promise<void>;
			};
			await adapter.initialize({});

			expect(logger.info).toHaveBeenCalledWith('[DiscordAdapter] Discord adapter initialized');
			for (const [, ...rest] of logger.info.mock.calls) {
				expect(rest).toEqual([]);
			}
		});
	});

	describe('search_channels', () => {
		let stub: ReturnType<typeof installFetchStub>;

		afterEach(() => {
			stub?.restore();
		});

		it('carries the credential bot token through to the Discord API', async () => {
			stub = installFetchStub({
				match: /discord\.com\/api/,
				onRequest: ({ url }) => {
					const path = new URL(url).pathname.replace(/^\/api\/v\d+/, '');
					const apiCall = { method: path, body: {} };
					if (path === '/users/@me/guilds') {
						return { apiCall, responseBody: [{ id: GUILD_ID, name: 'n8n Test Server' }] };
					}
					return {
						apiCall,
						responseBody: [{ id: '700000000000000001', name: 'general', type: 0 }],
					};
				},
			});

			const ctx = connectionContext();
			await integration.createAdapter(ctx);
			await integration.onConnected(ctx);

			await expect(integration.executeContextQuery(searchQuery())).resolves.toMatchObject({
				ok: true,
				channels: [{ channelId: `discord:${GUILD_ID}:700000000000000001`, name: 'general' }],
			});
		});

		it('reports the connection as unavailable when the agent has no live connection', async () => {
			await expect(integration.executeContextQuery(searchQuery())).resolves.toMatchObject({
				ok: false,
				error: { code: 'CONNECTION_NOT_AVAILABLE' },
			});
		});
	});
});
