import {
	fetchChannelName,
	text,
	type DecodedThread,
	type OriginDraft,
	type OriginInput,
} from '../../integration-origin-support';

export async function buildDiscordOriginDraft(
	{ thread }: OriginInput,
	decoded: DecodedThread,
): Promise<OriginDraft> {
	const guildId = text(decoded.guildId);
	return {
		type: 'discord',
		serverId: guildId === '@me' ? undefined : guildId,
		channelId: text(decoded.channelId),
		channelName: thread.isDM ? undefined : await fetchChannelName(thread),
	};
}
