import type { AgentMessageIntegrationOrigin } from '@n8n/api-types';

import {
	fetchChannelName,
	text,
	type DecodedThread,
	type OriginDraft,
	type OriginInput,
	type OriginNames,
} from '../../integration-origin-support';

export function buildDiscordOriginDraft(decoded: DecodedThread): OriginDraft {
	const guildId = text(decoded.guildId);
	return {
		type: 'discord',
		serverId: guildId === '@me' ? undefined : guildId,
		channelId: text(decoded.channelId),
	};
}

export async function fetchDiscordOriginNames(
	{ thread }: OriginInput,
	origin: AgentMessageIntegrationOrigin,
): Promise<OriginNames | undefined> {
	if (origin.type !== 'discord' || thread.isDM) return undefined;
	const channelName = await fetchChannelName(thread);
	return channelName ? { channelName } : undefined;
}
