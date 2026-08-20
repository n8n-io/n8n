import type { ILoadOptionsFunctions } from 'n8n-workflow';

export type BedrockInferenceProfileSummary = {
	inferenceProfileId: string;
	inferenceProfileName: string;
	inferenceProfileArn: string;
	description?: string;
	models?: Array<{ modelArn?: string }>;
};

/**
 * Fetches all Bedrock inference profiles. The ListInferenceProfiles API returns only
 * SYSTEM_DEFINED profiles unless type=APPLICATION is passed
 * (https://github.com/aws/aws-cli/issues/9728), so customer-created application
 * profiles require a second request; both result sets are merged.
 */
export async function listBedrockInferenceProfiles(
	ctx: ILoadOptionsFunctions,
	credentialsType: 'aws' | 'awsAssumeRole',
	baseURL: string,
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

	if (systemDefined.status === 'rejected' && application.status === 'rejected') {
		throw systemDefined.reason;
	}
	for (const [profileType, result] of [
		['SYSTEM_DEFINED', systemDefined],
		['APPLICATION', application],
	] as const) {
		if (result.status === 'rejected') {
			ctx.logger.warn('Bedrock model listing: inference-profiles request failed', {
				error: result.reason,
				profileType,
			});
		}
	}

	return [systemDefined, application].flatMap((result) =>
		result.status === 'fulfilled' ? (result.value.inferenceProfileSummaries ?? []) : [],
	);
}
