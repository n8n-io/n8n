import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export interface DeepSeekModel {
	id: string;
}

export async function getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials<{ url?: string }>('deepSeekApi');

	const baseURL = credentials.url ?? 'https://api.deepseek.com';
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'deepSeekApi', {
		url: `${baseURL}/models`,
		method: 'GET',
	})) as { data: DeepSeekModel[] };

	const models = response.data || [];

	const options: INodePropertyOptions[] = models.map((model) => ({
		name: model.id,
		value: model.id,
	}));

	// Sort models by name
	options.sort((a, b) => {
		const nameA = String(a.name).toLowerCase();
		const nameB = String(b.name).toLowerCase();
		return nameA.localeCompare(nameB);
	});

	return options;
}
