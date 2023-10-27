import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { discordApiRequest, getGuildId } from '../transport';

export async function getRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const guildId = await getGuildId.call(this);

	let response = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/roles`);

	const operations = this.getNodeParameter('operation') as string;

	if (operations === 'roleRemove') {
		const userId = this.getNodeParameter('userId', undefined, {
			extractValue: true,
		}) as string;

		const userRoles = ((
			await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/members/${userId}`)
		).roles || []) as string[];

		response = response.filter((role: IDataObject) => {
			return userRoles.includes(role.id as string);
		});
	}

	return response
		.filter((role: IDataObject) => role.name !== '@everyone' && !role.managed)
		.map((role: IDataObject) => ({
			name: role.name as string,
			value: role.id as string,
		}));
}
