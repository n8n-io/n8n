import {
	AgentMessageIntegrationOriginSchema,
	type AgentMessageIntegrationOrigin,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { Message, Thread } from 'chat';
import type { Logger } from 'n8n-workflow';

import type { IntegrationMessageSubject } from './integration-tool-types';

/** A slow name lookup must not delay the message. */
const CHANNEL_NAME_TIMEOUT_MS = 1500;

interface OriginInput {
	/** The integration type, such as `slack`. */
	platform: string;
	thread: Thread<unknown, unknown>;
	message: Message<unknown>;
	subject?: IntegrationMessageSubject;
}

type OriginDraft = Record<string, unknown> & { type: AgentMessageIntegrationOrigin['type'] };

/**
 * Builds the typed platform context for an inbound message from trusted adapter
 * data. Returns `undefined` when the context is missing or invalid. It never throws.
 */
export async function buildIntegrationOrigin(
	input: OriginInput,
	logger: Logger,
): Promise<AgentMessageIntegrationOrigin | undefined> {
	try {
		const draft = await buildDraft(input);
		if (!draft) return undefined;
		const parsed = AgentMessageIntegrationOriginSchema.safeParse(draft);
		if (parsed.success) return parsed.data;
		logger.debug('[AgentChatBridge] Dropped invalid integration origin', { type: draft.type });
	} catch (error) {
		logger.debug('[AgentChatBridge] Failed to build integration origin', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
	return undefined;
}

async function buildDraft(input: OriginInput): Promise<OriginDraft | undefined> {
	const decoded = decodeThread(input.thread);
	if (!decoded) return undefined;
	switch (input.platform) {
		case 'slack':
			return await slackDraft(input, decoded);
		case 'discord':
			return await discordDraft(input, decoded);
		case 'linear':
			return linearDraft(input, decoded);
		case 'telegram':
			return telegramDraft(decoded);
		case 'teams':
			return teamsDraft(decoded);
		case 'whatsapp':
			return whatsappDraft(decoded);
		default:
			return undefined;
	}
}

function decodeThread(thread: Thread<unknown, unknown>): Record<string, unknown> | undefined {
	const decoded: unknown = thread.adapter.decodeThreadId(thread.id);
	return isRecord(decoded) ? decoded : undefined;
}

function text(value: unknown): string | undefined {
	if (typeof value === 'string' && value !== '') return value;
	return typeof value === 'number' ? String(value) : undefined;
}

async function slackDraft(
	{ thread, message }: OriginInput,
	decoded: Record<string, unknown>,
): Promise<OriginDraft> {
	const raw = isRecord(message.raw) ? message.raw : {};
	const conversationKind = slackConversationKind(thread, raw);
	return {
		type: 'slack',
		workspaceId: text(raw.team_id) ?? text(raw.team),
		conversationKind,
		channelId: text(decoded.channel),
		channelName: conversationKind === 'dm' ? undefined : await fetchChannelName(thread),
	};
}

function slackConversationKind(
	thread: Thread<unknown, unknown>,
	raw: Record<string, unknown>,
): 'dm' | 'group' | 'channel' {
	if (thread.isDM) return 'dm';
	return raw.channel_type === 'mpim' ? 'group' : 'channel';
}

async function discordDraft(
	{ thread }: OriginInput,
	decoded: Record<string, unknown>,
): Promise<OriginDraft> {
	const guildId = text(decoded.guildId);
	return {
		type: 'discord',
		serverId: guildId === '@me' ? undefined : guildId,
		channelId: text(decoded.channelId),
		channelName: thread.isDM ? undefined : await fetchChannelName(thread),
	};
}

function linearDraft({ subject }: OriginInput, decoded: Record<string, unknown>): OriginDraft {
	return {
		type: 'linear',
		issueId: text(decoded.issueId),
		identifier: subject?.id,
		title: subject?.title,
	};
}

function telegramDraft(decoded: Record<string, unknown>): OriginDraft {
	return {
		type: 'telegram',
		chatId: text(decoded.chatId),
		messageThreadId: text(decoded.messageThreadId),
	};
}

function teamsDraft(decoded: Record<string, unknown>): OriginDraft {
	return {
		type: 'teams',
		conversationId: text(decoded.conversationId),
		conversationType: text(decoded.conversationType),
	};
}

function whatsappDraft(decoded: Record<string, unknown>): OriginDraft {
	return {
		type: 'whatsapp',
		phoneNumberId: text(decoded.phoneNumberId),
		userWaId: text(decoded.userWaId),
	};
}

/** The name is an optional snapshot. Any failure leaves it out. */
async function fetchChannelName(thread: Thread<unknown, unknown>): Promise<string | undefined> {
	try {
		const info = await withTimeout(thread.channel.fetchMetadata(), CHANNEL_NAME_TIMEOUT_MS);
		return text(info.name);
	} catch {
		return undefined;
	}
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error('Timed out')), ms);
	});
	try {
		return await Promise.race([promise, timeout]);
	} finally {
		clearTimeout(timer);
	}
}
