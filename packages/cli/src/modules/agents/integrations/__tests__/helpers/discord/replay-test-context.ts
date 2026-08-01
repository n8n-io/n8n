import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger as BackendLogger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ChatInstance } from '../../../chat-integration.service';
import { ComponentMapper } from '../../../component-mapper';
import type { ChatIntegrationActionExecutor } from '../../../integration-action-executor';
import type {
	getIntegrationToolConnectionDescriptors,
	IntegrationMessageContext,
} from '../../../integration-tools';
import { DiscordIntegration } from '../../../platforms/discord-integration';
import {
	createReplayContextSetup,
	installFetchStub,
	type MemoryMessageContextStore,
	type ReplayApiCall,
	type ReplayContextSetup,
	type ReplayWebhookHandler,
	sendJsonWebhook,
} from '../replay-test-helpers';

export const DISCORD_BOT_TOKEN = 'test-discord-bot-token';
/** Discord uses the application ID as the bot's user ID. */
export const DISCORD_APPLICATION_ID = '900000000000000001';
export const DISCORD_PUBLIC_KEY = 'a'.repeat(64);
export const DISCORD_GUILD_ID = '800000000000000001';
export const DISCORD_CHANNEL_ID = '700000000000000001';
/** ID the stubbed Discord API hands back when the adapter opens a thread. */
export const DISCORD_THREAD_ID = '600000000000000001';
export const DISCORD_DM_CHANNEL_ID = '650000000000000001';

export interface DiscordAuthorFixture {
	id: string;
	username: string;
	global_name?: string;
	bot?: boolean;
}

/** Raw Discord `MESSAGE_CREATE` payload, as the Gateway delivers it. */
export interface DiscordMessageFixture {
	id: string;
	channel_id: string;
	guild_id?: string;
	author: DiscordAuthorFixture;
	content: string;
	timestamp: string;
	mentions: Array<{ id: string }>;
	mention_roles?: string[];
	attachments: unknown[];
	thread?: { id: string; parent_id: string };
	channel_type?: number;
	is_mention?: boolean;
}

export interface DiscordReplayFixtures {
	bot: DiscordAuthorFixture;
	user: DiscordAuthorFixture;
	mention: DiscordMessageFixture;
	followUp: DiscordMessageFixture;
	selfMessage: DiscordMessageFixture;
}

export type DiscordApiCall = ReplayApiCall;

export interface DiscordReplayContext extends Omit<ReplayContextSetup, 'nextStream' | 'chat'> {
	chat: ChatInstance;
	agentExecutor: {
		executeForChatPublished: Mock;
		resumeForChat: Mock;
	};
	actionExecutor: ChatIntegrationActionExecutor;
	apiCalls: DiscordApiCall[];
	descriptor: ReturnType<typeof getIntegrationToolConnectionDescriptors>[number];
	integration: AgentIntegrationConfig;
	messageContextStore: MemoryMessageContextStore;
	/** Deliver a Gateway MESSAGE_CREATE payload. */
	sendWebhook: (message: unknown) => Promise<Response>;
	/** Deliver a signed HTTP interaction (button click / slash command). */
	sendInteraction: (interaction: unknown) => Promise<Response>;
	latestContext: () => IntegrationMessageContext | undefined;
	latestThreadId: () => string | undefined;
	lastApiCall: (method: string) => DiscordApiCall | undefined;
	lastPost: () => DiscordApiCall | undefined;
	nextStream: (chunks: StreamChunk[]) => void;
}

/**
 * Answer the Discord REST API for the real `@chat-adapter/discord` adapter.
 *
 * Each call is recorded as `{ method: "<VERB> <path>", body }` so assertions can
 * name the endpoint the adapter actually hit.
 */
function installDiscordApiStub() {
	let nextMessageId = 1000;
	return installFetchStub({
		match: /discord\.com\/api/,
		onRequest: ({ httpMethod, url, body }) => {
			const path = new URL(url).pathname.replace(/^\/api\/v\d+/, '');
			const apiCall = { method: `${httpMethod} ${path}`, body };

			// Auto-thread creation for a channel mention.
			if (httpMethod === 'POST' && path.endsWith('/threads')) {
				return { apiCall, responseBody: { id: DISCORD_THREAD_ID, name: 'Thread' } };
			}
			if (httpMethod === 'POST' && path === '/users/@me/channels') {
				return { apiCall, responseBody: { id: DISCORD_DM_CHANNEL_ID } };
			}
			if (httpMethod === 'GET' && /^\/channels\/\d+$/.test(path)) {
				return {
					apiCall,
					responseBody: { id: path.split('/')[2], parent_id: DISCORD_CHANNEL_ID, type: 11 },
				};
			}
			if (httpMethod === 'POST' && path.endsWith('/messages')) {
				return {
					apiCall,
					responseBody: { id: String(nextMessageId++), channel_id: path.split('/')[2] },
				};
			}
			return { apiCall, responseBody: {} };
		},
	});
}

function createIntegration() {
	return new DiscordIntegration(mock<BackendLogger>(), mock<InstanceSettings>());
}

/**
 * Build a Discord replay context around the real adapter, real Chat SDK and real
 * bridge, with only the Discord REST API stubbed at the network boundary.
 *
 * Inbound messages are injected through the adapter's forwarded-Gateway-event
 * path: a POST carrying `x-discord-gateway-token` is routed to
 * `handleForwardedGatewayEvent`, which parses and dispatches exactly as the
 * Gateway WebSocket handler does. Production never uses that forwarding mode
 * (it would put the bot token on the wire), but it is the only seam that lets a
 * test drive a Discord message without a live socket — discord.js constructs its
 * client inside `startGatewayListener`, so it cannot be injected.
 *
 * Button clicks go through `sendInteraction`, which is the real HTTP path;
 * signature verification is bypassed there because Ed25519-signing every fixture
 * would test the `discord-interactions` library rather than n8n.
 */
export async function createDiscordReplayContext(
	fixtures: DiscordReplayFixtures,
	options: {
		stream?: StreamChunk[];
		integration?: AgentIntegrationConfig;
	} = {},
): Promise<DiscordReplayContext> {
	const stub = installDiscordApiStub();

	// Dynamic imports — the chat packages are ESM-only. Unlike production (which
	// must route through esm-loader to dodge the CJS transform), vitest loads ESM
	// natively, so the tests use the real adapters directly.
	const { createDiscordAdapter } = await import('@chat-adapter/discord');
	const { Chat } = await import('chat');
	const { createMemoryState } = await import('@chat-adapter/state-memory');

	const adapter = createDiscordAdapter({
		botToken: DISCORD_BOT_TOKEN,
		publicKey: DISCORD_PUBLIC_KEY,
		applicationId: DISCORD_APPLICATION_ID,
		mentionRoleIds: [],
		apiUrl: 'https://discord.com/api/v10',
	});
	const chat = new Chat({
		userName: 'n8n-agent-agent-1',
		adapters: { discord: adapter } as unknown as Record<string, never>,
		state: createMemoryState(),
	});

	const integration = options.integration ?? {
		type: 'discord',
		credentialId: 'cred-discord',
	};
	const setup = createReplayContextSetup({
		chat: chat as never,
		integrationImpl: createIntegration(),
		integration,
		componentMapper: new ComponentMapper(),
		stream: options.stream,
	});

	await chat.initialize();

	const webhookUrl =
		'https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/discord';
	const webhooks = chat.webhooks as Record<string, ReplayWebhookHandler>;
	const post = async (payload: unknown, headers: Headers) =>
		await sendJsonWebhook(
			async (request, requestOptions) => await webhooks.discord(request, requestOptions),
			webhookUrl,
			payload,
			headers,
		);

	const sendWebhook = async (message: unknown) => {
		const headers = new Headers();
		headers.set('x-discord-gateway-token', DISCORD_BOT_TOKEN);
		return await post(
			{ type: 'GATEWAY_MESSAGE_CREATE', timestamp: Date.now(), data: message },
			headers,
		);
	};

	const sendInteraction = async (interaction: unknown) => {
		vi.spyOn(
			adapter as unknown as { verifySignature: () => Promise<boolean> },
			'verifySignature',
		).mockResolvedValue(true);
		const headers = new Headers();
		headers.set('x-signature-ed25519', 'test-signature');
		headers.set('x-signature-timestamp', String(Math.floor(Date.now() / 1000)));
		return await post(interaction, headers);
	};

	const isMessagePost = (call: DiscordApiCall) =>
		call.method.startsWith('POST ') && call.method.endsWith('/messages');

	return {
		...setup,
		chat: chat as unknown as ChatInstance,
		apiCalls: stub.apiCalls,
		sendWebhook,
		sendInteraction,
		latestContext: () => setup.messageContextStore.latest(),
		latestThreadId: () => setup.messageContextStore.latestThreadId(),
		lastApiCall: (method: string) => stub.apiCalls.filter((call) => call.method === method).at(-1),
		lastPost: () => stub.apiCalls.filter(isMessagePost).at(-1),
		shutdown: async () => {
			try {
				await setup.shutdown();
			} finally {
				stub.restore();
			}
		},
	};
}
