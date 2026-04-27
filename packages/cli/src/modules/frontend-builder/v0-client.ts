import { frontendBuilderMessageSchema, type FrontendBuilderMessage } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { ChatDetail } from 'v0-sdk';
import { createClient } from 'v0-sdk';

import { FrontendBuilderConfig } from './frontend-builder.config';
import type { IV0Client, V0ChatResult } from './v0-client.interface';

type V0Instance = ReturnType<typeof createClient>;

@Service()
export class V0Client implements IV0Client {
	private readonly v0: V0Instance;

	constructor(config: FrontendBuilderConfig) {
		if (!config.apiKey) {
			throw new Error('V0_API_KEY is required to construct V0Client');
		}
		this.v0 = createClient({ apiKey: config.apiKey });
	}

	async create({ message }: { message: string }): Promise<V0ChatResult> {
		const response = await this.v0.chats.create({ message, responseMode: 'sync' });
		return toResult(ensureChatDetail(response));
	}

	async sendMessage({
		chatId,
		message,
	}: {
		chatId: string;
		message: string;
	}): Promise<V0ChatResult> {
		const response = await this.v0.chats.sendMessage({
			chatId,
			message,
			responseMode: 'sync',
		});
		return toResult(ensureChatDetail(response));
	}

	async getChat(chatId: string): Promise<V0ChatResult> {
		const chat = await this.v0.chats.getById({ chatId });
		return toResult(chat);
	}
}

/**
 * `chats.create` and `chats.sendMessage` return `ChatDetail | ReadableStream`
 * regardless of `responseMode: 'sync'`, because the SDK's static return type
 * is a union. Verify at runtime so TS narrows correctly and we fail loudly
 * if v0 ever returns the stream variant unexpectedly.
 */
function ensureChatDetail(value: ChatDetail | ReadableStream<Uint8Array>): ChatDetail {
	if (
		value !== null &&
		typeof value === 'object' &&
		'id' in value &&
		'messages' in value &&
		Array.isArray(value.messages)
	) {
		return value;
	}
	throw new Error('v0-sdk returned a streaming response when sync was requested');
}

function toResult(chat: ChatDetail): V0ChatResult {
	return {
		chatId: chat.id,
		demoUrl: chat.latestVersion?.demoUrl ?? null,
		messages: chat.messages.filter(isPlainMessage).map(toMessage),
	};
}

function isPlainMessage(m: ChatDetail['messages'][number]): boolean {
	return m.type === 'message';
}

/**
 * Normalise a v0-sdk message into our shape, then validate against
 * `frontendBuilderMessageSchema`. Throws if v0's shape has drifted —
 * we want to see that loudly rather than silently forward garbage.
 */
function toMessage(raw: ChatDetail['messages'][number]): FrontendBuilderMessage {
	return frontendBuilderMessageSchema.parse({
		role: raw.role,
		content: raw.content,
		createdAt: raw.createdAt,
	});
}
