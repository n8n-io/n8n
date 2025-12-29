import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export interface XAiModel {
	id: string;
}

export async function getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials<{ url?: string }>('xAiApi');

	const baseURL = credentials.url ?? 'https://api.x.ai/v1';
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'xAiApi', {
		url: `${baseURL}/models`,
		method: 'GET',
	})) as { data: XAiModel[] };

	const models = response.data || [];

	const options: INodePropertyOptions[] = models.map((model) => ({
		name: model.id,
		value: model.id,
	}));

	// Sort models by name
	options.sort((a, b) => {
		const nameA = (a.name as string).toLowerCase();
		const nameB = (b.name as string).toLowerCase();
		return nameA.localeCompare(nameB);
	});

	return options;
}
