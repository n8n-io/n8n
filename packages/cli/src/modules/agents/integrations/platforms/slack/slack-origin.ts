import { isRecord } from '@n8n/utils/is-record';

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
	const conversationKind = slackConversationKind(raw);
	return {
		type: 'slack',
		workspaceId: typeof raw.n8nWorkspaceId === 'string' ? text(raw.n8nWorkspaceId) : undefined,
		conversationKind,
		channelId: text(decoded.channel),
		channelName: conversationKind === 'dm' ? undefined : await fetchChannelName(thread),
	};
}

function slackConversationKind(
	raw: Record<string, unknown>,
): 'dm' | 'group' | 'channel' | undefined {
	switch (raw.channel_type) {
		case 'im':
			return 'dm';
		case 'mpim':
			return 'group';
		case 'channel':
		case 'group':
			return 'channel';
		case undefined:
			return raw.type === 'app_mention' ? 'channel' : undefined;
		default:
			return undefined;
	}
}
