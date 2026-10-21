import {
	AgentMessageIntegrationOriginSchema,
	type AgentMessageIntegrationOrigin,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { Thread } from 'chat';
import type { Logger } from 'n8n-workflow';

import type { DecodedThread, OriginDraft, OriginInput } from './integration-origin-support';
import { buildDiscordOriginDraft } from './platforms/discord-origin';
import { buildLinearOriginDraft } from './platforms/linear-origin';
import { buildSlackOriginDraft } from './platforms/slack/slack-origin';
import { buildTeamsOriginDraft } from './platforms/teams/teams-origin';
import { buildTelegramOriginDraft } from './platforms/telegram-origin';
import { buildWhatsAppOriginDraft } from './platforms/whatsapp/whatsapp-origin';

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
			return await buildSlackOriginDraft(input, decoded);
		case 'discord':
			return await buildDiscordOriginDraft(input, decoded);
		case 'linear':
			return buildLinearOriginDraft(input, decoded);
		case 'telegram':
			return buildTelegramOriginDraft(decoded);
		case 'teams':
			return buildTeamsOriginDraft(decoded);
		case 'whatsapp':
			return buildWhatsAppOriginDraft(decoded);
		default:
			return undefined;
	}
}

function decodeThread(thread: Thread<unknown, unknown>): DecodedThread | undefined {
	const decoded: unknown = thread.adapter.decodeThreadId(thread.id);
	return isRecord(decoded) ? decoded : undefined;
}
