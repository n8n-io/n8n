import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import type { BedrockApi } from './resolveBedrockApi';

export type BedrockInferenceProfileSummary = {
	inferenceProfileId: string;
	inferenceProfileName: string;
	inferenceProfileArn: string;
	description?: string;
	models?: Array<{ modelArn?: string }>;
};

export function toProfileOption(profile: BedrockInferenceProfileSummary): INodePropertyOptions {
	return {
		name: profile.inferenceProfileName,
		value: profile.inferenceProfileId,
		description: profile.description ?? profile.inferenceProfileArn,
	};
}

/**
 * Fetches all Bedrock inference profiles. The ListInferenceProfiles API returns only
 * SYSTEM_DEFINED profiles unless type=APPLICATION is passed
 * (https://github.com/aws/aws-cli/issues/9728), so customer-created application
 * profiles require a second request; both result sets are merged.
 */
export async function listBedrockInferenceProfiles(
	ctx: ILoadOptionsFunctions,
	{ credentialsType, baseURL }: BedrockApi,
): Promise<BedrockInferenceProfileSummary[]> {
	const request = async (url: string) =>
		await (ctx.helpers.httpRequestWithAuthentication.call(ctx, credentialsType, {
			method: 'GET',
			baseURL,
			url,
			json: true,
		}) as Promise<{ inferenceProfileSummaries?: BedrockInferenceProfileSummary[] }>);

	const [systemDefined, application] = await Promise.allSettled([
		request('/inference-profiles?maxResults=1000'),
		request('/inference-profiles?maxResults=1000&type=APPLICATION'),
	]);

	const results = [
		['SYSTEM_DEFINED', systemDefined],
		['APPLICATION', application],
	] as const;

	const profiles = results.flatMap(([profileType, result]) => {
		if (result.status === 'fulfilled') return result.value.inferenceProfileSummaries ?? [];
		// Logged per type before any throw: the two calls can fail for different reasons
		// (missing IAM action vs throttling) and only one of them can be rethrown.
		ctx.logger.warn('Bedrock model listing: inference-profiles request failed', {
			error: result.reason,
			profileType,
		});
		return [];
	});

	if (systemDefined.status === 'rejected' && application.status === 'rejected') {
		throw systemDefined.reason;
	}
	// Dedupe by ARN in case both requests return overlapping profile lists.
	return [...new Map(profiles.map((profile) => [profile.inferenceProfileArn, profile])).values()];
}
