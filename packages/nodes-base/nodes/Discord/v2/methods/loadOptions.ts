import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { discordApiRequest } from '../transport';

export async function getRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const guildId = this.getNodeParameter('guildId', undefined, {
		extractValue: true,
	}) as string;

	const response = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/roles`);

	return response.map((role: IDataObject) => ({
		name: role.name as string,
		value: role.id as string,
	}));
}
