import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger as BackendLogger } from '@n8n/backend-common';
import type { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import type { SsrfProtectionConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { UrlService } from '@/services/url.service';

import type { AgentRepository } from '../../../../repositories/agent.repository';
import type { ChatInstance } from '../../../chat-integration.service';
import { ComponentMapper } from '../../../component-mapper';
import type { ChatIntegrationActionExecutor } from '../../../integration-action-executor';
import type {
	getIntegrationToolConnectionDescriptors,
	IntegrationMessageContext,
} from '../../../integration-tools';
import { TelegramIntegration } from '../../../platforms/telegram-integration';
import {
	createReplayContextSetup,
	installFetchStub,
	type MemoryMessageContextStore,
	type ReplayApiCall,
	type ReplayContextSetup,
	type ReplayWebhookHandler,
	sendJsonWebhook,
} from '../replay-test-helpers';

export interface TelegramUserFixture {
	id: number;
	first_name: string;
	is_bot: boolean;
	username?: string;
	last_name?: string;
	language_code?: string;
}

export interface TelegramChatFixture {
	id: number;
	type: 'private' | 'group' | 'supergroup' | 'channel';
	first_name?: string;
	last_name?: string;
	username?: string;
	title?: string;
}

export interface TelegramMessageFixture {
	message_id: number;
	from?: TelegramUserFixture;
	chat: TelegramChatFixture;
	date: number;
	text?: string;
	message_thread_id?: number;
}

export interface TelegramCallbackQueryFixture {
	id: string;
	from: TelegramUserFixture;
	message?: TelegramMessageFixture;
	data?: string;
	chat_instance?: string;
}

export interface TelegramUpdateFixture {
	update_id: number;
	message?: TelegramMessageFixture;
	callback_query?: TelegramCallbackQueryFixture;
}

export type TelegramApiCall = ReplayApiCall;

export interface TelegramReplayFixtures {
	mention: TelegramUpdateFixture;
	followUp: TelegramUpdateFixture;
	selfMessage: TelegramUpdateFixture;
	callbackBase: TelegramUpdateFixture;
	user: TelegramUserFixture;
	bot: TelegramUserFixture;
	chat: TelegramChatFixture;
}

export interface TelegramReplayContext extends Omit<ReplayContextSetup, 'nextStream' | 'chat'> {
	chat: ChatInstance;
	agentExecutor: {
		executeForChatPublished: Mock;
		resumeForChat: Mock;
	};
	actionExecutor: ChatIntegrationActionExecutor;
	apiCalls: TelegramApiCall[];
	descriptor: ReturnType<typeof getIntegrationToolConnectionDescriptors>[number];
	integration: AgentIntegrationConfig;
	messageContextStore: MemoryMessageContextStore;
	sendTelegramWebhook: (payload: unknown) => Promise<Response>;
	sendWebhook: (payload: unknown) => Promise<Response>;
	latestContext: () => IntegrationMessageContext | undefined;
	latestThreadId: () => string | undefined;
	lastApiCall: (method: string) => TelegramApiCall | undefined;
	lastPost: () => TelegramApiCall | undefined;
	nextStream: (chunks: StreamChunk[]) => void;
}

// Sanitized bot token from the recorded sessions — using it keeps the real
// adapter's outbound URLs identical to the captured fixtures.
const TELEGRAM_BOT_TOKEN = '123456789:abcdefghijkl';
const TELEGRAM_SECRET_TOKEN = 'test-secret-token';

/** Extract the Bot API method (`sendMessage`, `getMe`, …) from a request URL. */
function telegramMethodFromUrl(url: string): string {
	const path = url.split('?')[0];
	return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * Answer the Telegram Bot API for the real `@chat-adapter/telegram` adapter:
 * `getMe` returns the bot fixture (so the adapter learns its identity), and
 * `sendMessage` returns a minimal message; every call is recorded for assertions.
 */
function installTelegramApiStub(bot: TelegramUserFixture) {
	let nextMessageId = 1000;
	return installFetchStub({
		match: /api\.telegram\.org/,
		onRequest: ({ url, body }) => {
			const method = telegramMethodFromUrl(url);
			let result: unknown = true;
			if (method === 'getMe') {
				result = bot;
			} else if (method === 'sendMessage') {
				result = {
					message_id: nextMessageId++,
					chat: { id: Number(body.chat_id) },
					date: 1719000000,
					text: body.text ?? '',
				};
			}
			return { apiCall: { method, body }, responseBody: { ok: true, result } };
		},
	});
}

function createIntegration() {
	const urlService = mock<UrlService>();
	urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.example.com/');

	return new TelegramIntegration(
		mock<BackendLogger>(),
		urlService,
		mock<AgentRepository>(),
		mock<InstanceSettings>({ encryptionKey: 'test-encryption-key' }),
		mock<OutboundHttp>(),
		{ enabled: false } as SsrfProtectionConfig,
		mock<SsrfProtectionService>(),
	);
}

export function callbackPayloadWithData(
	payload: TelegramUpdateFixture,
	data: string,
	messageId: number,
): TelegramUpdateFixture {
	return {
		...payload,
		callback_query: payload.callback_query
			? {
					...payload.callback_query,
					data,
					message: payload.callback_query.message
						? { ...payload.callback_query.message, message_id: messageId }
						: undefined,
				}
			: undefined,
	};
}

export async function createTelegramReplayContext(
	fixtures: TelegramReplayFixtures,
	options: {
		stream?: StreamChunk[];
		integration?: AgentIntegrationConfig;
	} = {},
): Promise<TelegramReplayContext> {
	const stub = installTelegramApiStub(fixtures.bot);

	// Dynamic imports — the chat packages are ESM-only. Unlike production (which
	// must route through esm-loader to dodge the CJS transform), vitest loads ESM
	// natively, so the tests use the real adapters directly.
	const { createTelegramAdapter } = await import('@chat-adapter/telegram');
	const { Chat } = await import('chat');
	const { createMemoryState } = await import('@chat-adapter/state-memory');

	const adapter = createTelegramAdapter({
		botToken: TELEGRAM_BOT_TOKEN,
		mode: 'webhook',
		secretToken: TELEGRAM_SECRET_TOKEN,
		apiBaseUrl: 'https://api.telegram.org',
	});
	const chat = new Chat({
		userName: 'n8n-agent-agent-1',
		adapters: { telegram: adapter } as unknown as Record<string, never>,
		state: createMemoryState(),
	});

	const integration = options.integration ?? {
		type: 'telegram',
		credentialId: 'cred-telegram',
		settings: { accessMode: 'public', allowedUsers: [] },
	};
	const setup = createReplayContextSetup({
		chat: chat as never,
		integrationImpl: createIntegration(),
		integration,
		componentMapper: new ComponentMapper(),
		stream: options.stream,
	});

	// Connects the adapter (calls `getMe`, served by the stub) and wires webhooks.
	await chat.initialize();

	const webhooks = chat.webhooks as Record<string, ReplayWebhookHandler>;
	const sendTelegramWebhook = async (payload: unknown) => {
		const headers = new Headers();
		headers.set('x-telegram-bot-api-secret-token', TELEGRAM_SECRET_TOKEN);
		return await sendJsonWebhook(
			async (request, requestOptions) => await webhooks.telegram(request, requestOptions),
			'https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/telegram',
			payload,
			headers,
		);
	};

	return {
		...setup,
		chat: chat as unknown as ChatInstance,
		apiCalls: stub.apiCalls,
		sendTelegramWebhook,
		sendWebhook: sendTelegramWebhook,
		latestContext: () => setup.messageContextStore.latest(),
		latestThreadId: () => setup.messageContextStore.latestThreadId(),
		lastApiCall: (method: string) => stub.apiCalls.filter((call) => call.method === method).at(-1),
		lastPost: () => stub.apiCalls.filter((call) => call.method === 'sendMessage').at(-1),
		shutdown: async () => {
			try {
				await setup.shutdown();
			} finally {
				stub.restore();
			}
		},
	};
}

export function getTelegramInlineCallbackData(
	call: TelegramApiCall | undefined,
): string | undefined {
	// The real adapter sends `reply_markup` as a JSON object in the request body
	// (Telegram accepts it inline in JSON mode); tolerate a stringified form too.
	const replyMarkup = call?.body.reply_markup;
	let markup: unknown = replyMarkup;
	if (typeof replyMarkup === 'string') {
		try {
			markup = JSON.parse(replyMarkup);
		} catch {
			return undefined;
		}
	}
	if (!markup || typeof markup !== 'object') return undefined;
	const inlineKeyboard = (markup as { inline_keyboard?: Array<Array<{ callback_data?: string }>> })
		.inline_keyboard;
	return inlineKeyboard?.[0]?.[0]?.callback_data;
}
