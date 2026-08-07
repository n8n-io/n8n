import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';

import type { Agent } from '../../entities/agent.entity';
import type { AgentRepository } from '../../repositories/agent.repository';
import type {
	AgentChatIntegrationContext,
	PlatformContextQueryParams,
} from '../agent-chat-integration';
import type { ChatInstance } from '../chat-integration.service';
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

function createFetchBackedHttpClient(): HttpRequestClient {
	return {
		request: vi.fn(
			async (request: {
				method?: string;
				url: string;
				headers?: Record<string, string>;
				body?: unknown;
				encoding?: string;
			}) => {
				const response = await globalThis.fetch(request.url, {
					method: request.method,
					headers: request.headers,
					body: request.body ? JSON.stringify(request.body) : undefined,
				});
				const body =
					request.encoding === 'arraybuffer'
						? Buffer.from(await response.arrayBuffer())
						: await response.json();
				return { body, headers: {}, statusCode: response.status };
			},
		),
	} as unknown as HttpRequestClient;
}

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
		ingressEnabled: true,
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
	let outboundHttp: ReturnType<typeof mock<OutboundHttp>>;

	beforeEach(() => {
		agentRepository = mock<AgentRepository>();
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		logger = mock<Logger>();
		outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(createFetchBackedHttpClient());
		integration = new DiscordIntegration(
			logger,
			mock<InstanceSettings>({ isLeader: false }),
			agentRepository,
			outboundHttp,
		);
	});

	it('rejects gateway forwarding and routes interaction webhooks by application ID', () => {
		expect(
			integration.resolveWebhookRequest({
				headers: { 'x-discord-gateway-token': 'token' },
				body: { application_id: APPLICATION_ID },
			}),
		).toEqual({
			type: 'reject',
			response: { status: 404, body: { error: 'Not found' } },
		});
		expect(
			integration.resolveWebhookRequest({
				headers: {},
				body: { application_id: APPLICATION_ID },
			}),
		).toEqual({ type: 'select', connectionSelector: APPLICATION_ID });
		expect(integration.resolveWebhookRequest({ headers: {}, body: { type: 1 } })).toEqual({
			type: 'no_match',
		});
	});

	it('matches webhook selectors against the normalized credential application ID', () => {
		expect(
			integration.matchesWebhookConnection(
				{ applicationId: ` ${APPLICATION_ID} ` },
				APPLICATION_ID,
			),
		).toBe(true);
		expect(integration.matchesWebhookConnection({ applicationId: 'other' }, APPLICATION_ID)).toBe(
			false,
		);
		expect(integration.matchesWebhookConnection({}, APPLICATION_ID)).toBe(false);
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

	it('subscribes DMs and real threads, but not a parent channel after thread creation fails', () => {
		const shouldSubscribe = (threadId: string) =>
			integration.shouldSubscribeToNewMention({
				thread: { id: threadId } as never,
				message: {} as never,
			});

		expect(shouldSubscribe('discord:@me:400000000000000001')).toBe(true);
		expect(
			shouldSubscribe('discord:800000000000000001:700000000000000001:600000000000000001'),
		).toBe(true);
		expect(shouldSubscribe('discord:800000000000000001:700000000000000001')).toBe(false);
	});

	it.each([
		{
			name: 'new mention',
			threadId: `discord:${GUILD_ID}:700000000000000001:600000000000000001`,
			isNewMention: true,
			isMention: false,
			expected: 'required',
		},
		{
			name: 'explicit mention',
			threadId: `discord:${GUILD_ID}:700000000000000001:600000000000000001`,
			isNewMention: false,
			isMention: true,
			expected: 'required',
		},
		{
			name: 'DM follow-up',
			threadId: 'discord:@me:400000000000000001',
			isNewMention: false,
			isMention: false,
			expected: 'required',
		},
		{
			name: 'guild thread follow-up',
			threadId: `discord:${GUILD_ID}:700000000000000001:600000000000000001`,
			isNewMention: false,
			isMention: false,
			expected: 'optional',
		},
		{
			name: 'malformed thread',
			threadId: 'discord:invalid',
			isNewMention: false,
			isMention: false,
			expected: 'required',
		},
	] as const)('sets $name replies to $expected', (testCase) => {
		expect(
			integration.getReplyExpectation({
				message: { threadId: testCase.threadId, isMention: testCase.isMention } as never,
				isNewMention: testCase.isNewMention,
			}),
		).toBe(testCase.expected);
	});

	it('shows typing only when a reply is required', async () => {
		const startTyping = vi.fn().mockResolvedValue(undefined);
		const params = {
			chat: { getAdapter: vi.fn().mockReturnValue({}) },
			thread: { id: 'discord:@me:400000000000000001', startTyping },
			message: {},
			logger,
			agentId: AGENT_ID,
			isNewMention: false,
		};

		const optional = await integration.createBridgeExecutionContext({
			...params,
			replyExpectation: 'optional',
		} as never);
		expect(optional.statusHandle).toBeUndefined();
		expect(startTyping).not.toHaveBeenCalled();

		const required = await integration.createBridgeExecutionContext({
			...params,
			replyExpectation: 'required',
		} as never);
		expect(startTyping).toHaveBeenCalledOnce();
		await required.statusHandle?.clearBeforeResponse();
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
