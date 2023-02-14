import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { discordApiRequest } from '../transport';

export async function channelSearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const guildId = (
		(await discordApiRequest.call(this, 'GET', '/users/@me/guilds')) as IDataObject[]
	)[0].id as string;

	const response = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/channels`);

	return {
		results: (response as IDataObject[])
			.filter((cannel) => cannel.type !== 4) // Filter out categories
			.map((channel) => ({
				name: channel.name as string,
				value: channel.id as string,
				url: `https://discord.com/channels/${guildId}/${channel.id}`,
			})),
	};
}

export async function categorySearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const guildId = (
		(await discordApiRequest.call(this, 'GET', '/users/@me/guilds')) as IDataObject[]
	)[0].id as string;

	const response = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/channels`);

	return {
		results: (response as IDataObject[])
			.filter((cannel) => cannel.type === 4) // Return only categories
			.map((channel) => ({
				name: channel.name as string,
				value: channel.id as string,
				url: `https://discord.com/channels/${guildId}/${channel.id}`,
			})),
	};
}

export async function userSearch(
	this: ILoadOptionsFunctions,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const guildId = (
		(await discordApiRequest.call(this, 'GET', '/users/@me/guilds')) as IDataObject[]
	)[0].id as string;

	const qs = { limit: 1000, after: paginationToken };

	const response = await discordApiRequest.call(
		this,
		'GET',
		`/guilds/${guildId}/members`,
		undefined,
		qs,
	);

	if (response.length === 0) {
		return {
			results: [],
			paginationToken: undefined,
		};
	}

	const lastUserId = response[response.length - 1].user.id as string;

	return {
		results: (response as Array<{ user: IDataObject }>).map(({ user }) => ({
			name: user.username as string,
			value: user.id as string,
		})),
		paginationToken: lastUserId,
	};
}
