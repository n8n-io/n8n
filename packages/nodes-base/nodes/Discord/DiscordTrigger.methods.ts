import type {
	IDataObject,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Minimal bot-token request used only by the trigger's resource-locator
 * searches. Kept self-contained so the trigger doesn't depend on the Discord
 * action node's transport (which branches on an `authentication` parameter).
 */
async function discordBotApiRequest(
	this: ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	qs?: IDataObject,
): Promise<IDataObject[]> {
	return (await this.helpers.requestWithAuthentication.call(this, 'discordBotApi', {
		method,
		qs,
		url: `${DISCORD_API_BASE}${endpoint}`,
		json: true,
	})) as IDataObject[];
}

export async function guildSearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const guilds = await discordBotApiRequest.call(this, 'GET', '/users/@me/guilds');
	return {
		results: guilds.map((guild) => ({
			name: guild.name as string,
			value: guild.id as string,
			url: `https://discord.com/channels/${guild.id as string}`,
		})),
	};
}

// Container channel types that only hold other channels/threads and can never
// be a message or reaction `channel_id`: category (4), forum (15), media (16).
// Excluding these (rather than allow-listing messageable types) avoids dropping
// channels that do carry messages, e.g. text-in-voice.
const CONTAINER_CHANNEL_TYPES = new Set([4, 15, 16]);

export async function getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const guildId = this.getNodeParameter('guildId', '', { extractValue: true }) as string;
	if (!guildId) return [];

	const channels = await discordBotApiRequest.call(this, 'GET', `/guilds/${guildId}/channels`);
	return channels
		.filter((channel) => !CONTAINER_CHANNEL_TYPES.has(channel.type as number))
		.map((channel) => ({ name: channel.name as string, value: channel.id as string }));
}

export async function getRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const guildId = this.getNodeParameter('guildId', '', { extractValue: true }) as string;
	if (!guildId) return [];

	const roles = await discordBotApiRequest.call(this, 'GET', `/guilds/${guildId}/roles`);
	return roles
		.filter((role) => role.id !== guildId) // drop @everyone (its id equals the guild id)
		.sort((a, b) => (b.position as number) - (a.position as number))
		.map((role) => ({ name: role.name as string, value: role.id as string }));
}
