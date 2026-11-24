import { assertSupportedAwsRegion, type AWSRegion } from 'n8n-nodes-base/aws-credentials';

const BEDROCK_ARN_REGION = /^arn:(?:aws|aws-cn|aws-us-gov):bedrock:([a-z0-9-]+):/;

/**
 * Resolves the effective Bedrock region for a request. A model given as a full ARN
 * (e.g. a cross-region inference profile) carries its own region, which overrides the
 * credential's region; the region is validated before it reaches an endpoint URL.
 */
export function resolveBedrockRegion(modelName: string, credentialRegion: AWSRegion): AWSRegion {
	const arnRegion = modelName.match(BEDROCK_ARN_REGION)?.[1];
	if (arnRegion === undefined) {
		return credentialRegion;
	}
	assertSupportedAwsRegion(arnRegion);
	return arnRegion;
}
