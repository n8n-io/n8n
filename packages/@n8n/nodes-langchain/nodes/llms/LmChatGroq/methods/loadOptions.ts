import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export interface GroqModel {
	id: string;
	active?: boolean;
	object?: string;
}

export async function getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const baseURL = 'https://api.groq.com/openai/v1';
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'groqApi', {
		url: `${baseURL}/models`,
		method: 'GET',
	})) as { data: GroqModel[] };

	const models = response.data || [];

	// Filter for active chat models only
	const activeModels = models.filter((model) => model.active === true && model.object === 'model');

	const options: INodePropertyOptions[] = activeModels.map((model) => ({
		name: model.id,
		value: model.id,
	}));

	return options;
}
