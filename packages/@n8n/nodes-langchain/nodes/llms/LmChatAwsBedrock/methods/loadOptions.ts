import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export interface FoundationModel {
	modelName: string;
	modelId: string;
	modelArn: string;
}

export interface InferenceProfile {
	inferenceProfileName: string;
	inferenceProfileId: string;
	inferenceProfileArn: string;
	description?: string;
}

export async function getFoundationModels(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials<{ region?: string }>('aws');

	const region = credentials.region ?? 'eu-central-1';
	const baseURL = `https://bedrock.${region}.amazonaws.com`;
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'aws', {
		url: `${baseURL}/foundation-models?&byOutputModality=TEXT&byInferenceType=ON_DEMAND`,
		method: 'GET',
	})) as { modelSummaries: FoundationModel[] };

	const models = response.modelSummaries || [];

	const options: INodePropertyOptions[] = models.map((model) => ({
		name: model.modelName,
		value: model.modelId,
		description: model.modelArn,
	}));

	// Sort models by name
	options.sort((a, b) => {
		const nameA = (a.name as string).toLowerCase();
		const nameB = (b.name as string).toLowerCase();
		return nameA.localeCompare(nameB);
	});

	return options;
}

export async function getInferenceProfiles(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials<{ region?: string }>('aws');

	const region = credentials.region ?? 'eu-central-1';
	const baseURL = `https://bedrock.${region}.amazonaws.com`;
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'aws', {
		url: `${baseURL}/inference-profiles?maxResults=1000`,
		method: 'GET',
	})) as { inferenceProfileSummaries: InferenceProfile[] };

	const profiles = response.inferenceProfileSummaries || [];

	const options: INodePropertyOptions[] = profiles.map((profile) => ({
		name: profile.inferenceProfileName,
		value: profile.inferenceProfileId,
		description: profile.description || profile.inferenceProfileArn,
	}));

	// Sort profiles by name
	options.sort((a, b) => {
		const nameA = (a.name as string).toLowerCase();
		const nameB = (b.name as string).toLowerCase();
		return nameA.localeCompare(nameB);
	});

	return options;
}
