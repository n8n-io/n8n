import {
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
} from 'n8n-workflow';
import { discordApiRequest } from '../transport';
import { checkAccessToGuild } from '../helpers/utils';

async function getGuildId(this: ILoadOptionsFunctions) {
	const guildId = this.getNodeParameter('guildId', undefined, {
		extractValue: true,
	}) as string;

	const isOAuth2 = this.getNodeParameter('authentication', '') === 'oAuth2';

	if (isOAuth2) {
		const userGuilds = (await discordApiRequest.call(
			this,
			'GET',
			'/users/@me/guilds',
		)) as IDataObject[];

		checkAccessToGuild(this.getNode(), guildId, userGuilds);
	}

	return guildId;
}

async function checkBotAccessToGuild(this: ILoadOptionsFunctions, guildId: string, botId: string) {
	try {
		const members: Array<{ user: { id: string } }> = await discordApiRequest.call(
			this,
			'GET',
			`/guilds/${guildId}/members`,
			undefined,
			{ limit: 1000 },
		);

		return members.some((member) => member.user.id === botId);
	} catch (error) {}

	return false;
}

export async function guildSearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const response = (await discordApiRequest.call(
		this,
		'GET',
		'/users/@me/guilds',
	)) as IDataObject[];

	let guilds: IDataObject[] = [];

	const isOAuth2 = this.getNodeParameter('authentication', 0) === 'oAuth2';

	if (isOAuth2) {
		const botId = (await discordApiRequest.call(this, 'GET', '/users/@me')).id as string;

		for (const guild of response) {
			if (!(await checkBotAccessToGuild.call(this, guild.id as string, botId))) continue;
			guilds.push(guild);
		}
	} else {
		guilds = response;
	}

	return {
		results: guilds.map((guild) => ({
			name: guild.name as string,
			value: guild.id as string,
			url: `https://discord.com/channels/${guild.id}`,
		})),
	};
}

export async function channelSearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const guildId = await getGuildId.call(this);
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

export async function textChannelSearch(
	this: ILoadOptionsFunctions,
): Promise<INodeListSearchResult> {
	const guildId = await getGuildId.call(this);

	const response = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/channels`);

	return {
		results: (response as IDataObject[])
			.filter((cannel) => ![2, 4].includes(cannel.type as number)) // Only text channels
			.map((channel) => ({
				name: channel.name as string,
				value: channel.id as string,
				url: `https://discord.com/channels/${guildId}/${channel.id}`,
			})),
	};
}

export async function categorySearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const guildId = await getGuildId.call(this);

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
	_filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const guildId = await getGuildId.call(this);

	const limit = 100;
	const qs = { limit, after: paginationToken };

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

	let lastUserId;

	//less then limit means that there are no more users to return, so leave lastUserId undefined
	if (!(response.length < limit)) {
		lastUserId = response[response.length - 1].user.id as string;
	}

	return {
		results: (response as Array<{ user: IDataObject }>).map(({ user }) => ({
			name: user.username as string,
			value: user.id as string,
		})),
		paginationToken: lastUserId,
	};
}
