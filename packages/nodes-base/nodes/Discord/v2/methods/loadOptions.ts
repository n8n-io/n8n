import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { discordApiRequest } from '../transport';

export async function getRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const guildId = (
		(await discordApiRequest.call(this, 'GET', '/users/@me/guilds')) as IDataObject[]
	)[0].id as string;

	const response = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/roles`);

	return response.map((role: IDataObject) => ({
		name: role.name as string,
		value: role.id as string,
	}));
}
