import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

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

function connectionContext(): AgentChatIntegrationContext {
	return {
		agentId: AGENT_ID,
		projectId: 'project-1',
		credentialId: CREDENTIAL_ID,
		credential: {
			botToken: 'test-bot-token',
			publicKey: 'a'.repeat(64),
			applicationId: '900000000000000001',
		},
		webhookUrlFor: () => 'https://n8n.example.com/webhook',
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

	beforeEach(() => {
		integration = new DiscordIntegration(
			mock<Logger>(),
			mock<InstanceSettings>({ isLeader: false }),
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
