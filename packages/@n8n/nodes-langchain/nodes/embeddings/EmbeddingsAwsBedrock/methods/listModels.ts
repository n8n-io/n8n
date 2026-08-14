import { assertSupportedAwsRegion, getAwsDomain } from 'n8n-nodes-base/aws-credentials';
import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

type FoundationModelSummary = {
	modelId: string;
	modelName: string;
	modelArn: string;
	inferenceTypesSupported?: string[];
};

type InferenceProfileSummary = {
	inferenceProfileId: string;
	inferenceProfileName: string;
	inferenceProfileArn: string;
	description?: string;
	models?: Array<{ modelArn?: string }>;
};

export async function listModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const authentication = this.getNodeParameter('authentication', 'iam') as 'iam' | 'assumeRole';
	const credentialsType = authentication === 'assumeRole' ? 'awsAssumeRole' : 'aws';
	const { region } = await this.getCredentials(credentialsType);

	assertSupportedAwsRegion(region);
	// Declares the SigV4 service+region; the credential's authenticate step swaps the
	// host for the Bedrock Endpoint override (PrivateLink) when one is configured.
	// getAwsDomain keeps China (amazonaws.com.cn) / GovCloud endpoints correct.
	const baseURL = `https://bedrock.${region}.${getAwsDomain(region)}`;

	const [foundationModels, inferenceProfiles] = await Promise.allSettled([
		this.helpers.httpRequestWithAuthentication.call(this, credentialsType, {
			method: 'GET',
			baseURL,
			url: '/foundation-models?byOutputModality=EMBEDDING',
			json: true,
		}) as Promise<{ modelSummaries?: FoundationModelSummary[] }>,
		this.helpers.httpRequestWithAuthentication.call(this, credentialsType, {
			method: 'GET',
			baseURL,
			url: '/inference-profiles?maxResults=1000',
			json: true,
		}) as Promise<{ inferenceProfileSummaries?: InferenceProfileSummary[] }>,
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
		const isEmbeddingProfile = (profile: InferenceProfileSummary) =>
			foundationModels.status === 'rejected' ||
			(profile.models ?? []).some((model) =>
				embeddingModelIds.has(model.modelArn?.split('/').pop() ?? ''),
			);
		options.push(
			...(inferenceProfiles.value.inferenceProfileSummaries ?? [])
				.filter(isEmbeddingProfile)
				.map((profile) => ({
					name: profile.inferenceProfileName,
					value: profile.inferenceProfileId,
					description: profile.description ?? profile.inferenceProfileArn,
				})),
		);
	}
	return options.sort((a, b) => a.name.localeCompare(b.name));
}
