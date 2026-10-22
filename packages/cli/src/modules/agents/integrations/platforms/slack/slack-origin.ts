import { isRecord } from '@n8n/utils/is-record';
import type { Thread } from 'chat';

import {
	fetchChannelName,
	text,
	type DecodedThread,
	type OriginDraft,
	type OriginInput,
} from '../../integration-origin-support';

export async function buildSlackOriginDraft(
	{ thread, message }: OriginInput,
	decoded: DecodedThread,
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
