import { checkAccessToGuild } from '../helpers/utils';
import { discordApiRequest } from '../transport';
export async function getRoles() {
    const guildId = this.getNodeParameter('guildId', undefined, {
        extractValue: true,
    });
    const isOAuth2 = this.getNodeParameter('authentication', '') === 'oAuth2';
    if (isOAuth2) {
        const userGuilds = (await discordApiRequest.call(this, 'GET', '/users/@me/guilds'));
        checkAccessToGuild(this.getNode(), guildId, userGuilds);
    }
    let response = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/roles`);
    const operations = this.getNodeParameter('operation');
    if (operations === 'roleRemove') {
        const userId = this.getNodeParameter('userId', undefined, {
            extractValue: true,
        });
        const userRoles = ((await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/members/${userId}`)).roles || []);
        response = response.filter((role) => {
            return userRoles.includes(role.id);
        });
    }
    return response
        .filter((role) => role.name !== '@everyone' && !role.managed)
        .map((role) => ({
        name: role.name,
        value: role.id,
    }));
}
//# sourceMappingURL=loadOptions.js.map