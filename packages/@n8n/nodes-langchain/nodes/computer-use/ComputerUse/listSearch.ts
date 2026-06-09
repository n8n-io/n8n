import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

export async function getTools(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	if (!this.getGatewayTools) {
		return { results: [] };
	}

	const credentials = await this.getCredentials('deviceConnectionApi');
	const deviceOwnerId = (credentials.deviceOwnerId as string) || undefined;
	const { tools } = await this.getGatewayTools.call(this, deviceOwnerId);

	const filtered = filter
		? tools.filter((tool) => tool.name.toLowerCase().includes(filter.toLowerCase()))
		: tools;

	return {
		results: filtered.map((tool) => ({
			name: tool.name,
			value: tool.name,
			description: tool.description,
		})),
	};
}
