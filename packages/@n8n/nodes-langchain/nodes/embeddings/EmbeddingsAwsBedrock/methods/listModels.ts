import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import type { BedrockInferenceProfileSummary } from '@utils/aws/listBedrockInferenceProfiles';
import {
	listBedrockInferenceProfiles,
	toProfileOption,
} from '@utils/aws/listBedrockInferenceProfiles';
import { resolveBedrockApi } from '@utils/aws/resolveBedrockApi';

type FoundationModelSummary = {
	modelId: string;
	modelName: string;
	modelArn: string;
	inferenceTypesSupported?: string[];
};

export async function listModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const api = await resolveBedrockApi(this);

	const [foundationModels, inferenceProfiles] = await Promise.allSettled([
		this.helpers.httpRequestWithAuthentication.call(this, api.credentialsType, {
			method: 'GET',
			baseURL: api.baseURL,
			url: '/foundation-models?byOutputModality=EMBEDDING',
			json: true,
		}) as Promise<{ modelSummaries?: FoundationModelSummary[] }>,
		listBedrockInferenceProfiles(this, api),
	]);

	// The credential may lack one of the two list permissions
	// (bedrock:ListFoundationModels / bedrock:ListInferenceProfiles);
	// a single reachable source still renders a usable dropdown.
	if (foundationModels.status === 'rejected' && inferenceProfiles.status === 'rejected') {
		throw foundationModels.reason;
	}
	if (foundationModels.status === 'rejected') {
		this.logger.warn('Bedrock model listing: foundation-models request failed', {
			error: foundationModels.reason,
		});
	}
	if (inferenceProfiles.status === 'rejected') {
		this.logger.warn('Bedrock model listing: inference-profiles request failed', {
			error: inferenceProfiles.reason,
		});
	}

	const options: INodePropertyOptions[] = [];
	const embeddingModelIds = new Set<string>();
	if (foundationModels.status === 'fulfilled') {
		for (const model of foundationModels.value.modelSummaries ?? []) {
			embeddingModelIds.add(model.modelId);
			if (model.inferenceTypesSupported?.includes('ON_DEMAND')) {
				options.push({
					name: model.modelName,
					value: model.modelId,
					description: model.modelArn,
				});
			}
		}
	}
	if (inferenceProfiles.status === 'fulfilled') {
		// The inference-profiles API cannot filter by modality, so chat profiles are dropped
		// by matching each profile's underlying models against the embedding-model list.
		// Without that list every profile is kept: a usable, if noisy, dropdown.
		const isEmbeddingProfile = (profile: BedrockInferenceProfileSummary) =>
			foundationModels.status === 'rejected' ||
			(profile.models ?? []).some((model) =>
				embeddingModelIds.has(model.modelArn?.split('/').pop() ?? ''),
			);
		options.push(...inferenceProfiles.value.filter(isEmbeddingProfile).map(toProfileOption));
	}
	return options.sort((a, b) => a.name.localeCompare(b.name));
}
