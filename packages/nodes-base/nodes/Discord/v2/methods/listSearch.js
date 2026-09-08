import { checkAccessToGuild } from '../helpers/utils';
import { discordApiRequest } from '../transport';
async function getGuildId() {
    const guildId = this.getNodeParameter('guildId', undefined, {
        extractValue: true,
    });
    const isOAuth2 = this.getNodeParameter('authentication', '') === 'oAuth2';
    if (isOAuth2) {
        const userGuilds = (await discordApiRequest.call(this, 'GET', '/users/@me/guilds'));
        checkAccessToGuild(this.getNode(), guildId, userGuilds);
    }
    return guildId;
}
async function checkBotAccessToGuild(guildId, botId) {
    try {
        const members = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/members`, undefined, { limit: 1000 });
        return members.some((member) => member.user.id === botId);
    }
    catch (error) { }
    return false;
}
export async function guildSearch() {
    const response = (await discordApiRequest.call(this, 'GET', '/users/@me/guilds'));
    let guilds = [];
    const isOAuth2 = this.getNodeParameter('authentication', 0) === 'oAuth2';
    if (isOAuth2) {
        const botId = (await discordApiRequest.call(this, 'GET', '/users/@me')).id;
        for (const guild of response) {
            if (!(await checkBotAccessToGuild.call(this, guild.id, botId)))
                continue;
            guilds.push(guild);
        }
    }
    else {
        guilds = response;
    }
    return {
        results: guilds.map((guild) => ({
            name: guild.name,
            value: guild.id,
            url: `https://discord.com/channels/${guild.id}`,
        })),
    };
}
export async function channelSearch() {
    const guildId = await getGuildId.call(this);
    const response = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/channels`);
    return {
        results: response
            .filter((cannel) => cannel.type !== 4) // Filter out categories
            .map((channel) => ({
            name: channel.name,
            value: channel.id,
            url: `https://discord.com/channels/${guildId}/${channel.id}`,
        })),
    };
}
export async function textChannelSearch() {
    const guildId = await getGuildId.call(this);
    const response = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/channels`);
    return {
        results: response
            .filter((cannel) => ![2, 4].includes(cannel.type)) // Only text channels
            .map((channel) => ({
            name: channel.name,
            value: channel.id,
            url: `https://discord.com/channels/${guildId}/${channel.id}`,
        })),
    };
}
export async function categorySearch() {
    const guildId = await getGuildId.call(this);
    const response = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/channels`);
    return {
        results: response
            .filter((cannel) => cannel.type === 4) // Return only categories
            .map((channel) => ({
            name: channel.name,
            value: channel.id,
            url: `https://discord.com/channels/${guildId}/${channel.id}`,
        })),
    };
}
export async function userSearch(_filter, paginationToken) {
    const guildId = await getGuildId.call(this);
    const limit = 100;
    const qs = { limit, after: paginationToken };
    const response = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/members`, undefined, qs);
    if (response.length === 0) {
        return {
            results: [],
            paginationToken: undefined,
        };
    }
    let lastUserId;
    //less then limit means that there are no more users to return, so leave lastUserId undefined
    if (!(response.length < limit)) {
        lastUserId = response[response.length - 1].user.id;
    }
    return {
        results: response.map(({ user }) => ({
            name: user.username,
            value: user.id,
        })),
        paginationToken: lastUserId,
    };
}
//# sourceMappingURL=listSearch.js.map