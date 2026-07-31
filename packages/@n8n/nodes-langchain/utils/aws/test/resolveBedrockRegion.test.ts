import type { AWSRegion } from 'n8n-nodes-base/aws-credentials';

import { resolveBedrockRegion } from '../resolveBedrockRegion';

describe('resolveBedrockRegion', () => {
	const credentialRegion = 'us-east-1' as AWSRegion;

	it('returns the credential region for a plain model ID', () => {
		expect(resolveBedrockRegion('amazon.titan-embed-text-v2:0', credentialRegion)).toBe(
			'us-east-1',
		);
	});

	it('returns the credential region for a region-prefixed inference profile ID (not an ARN)', () => {
		expect(resolveBedrockRegion('eu.cohere.embed-v4:0', credentialRegion)).toBe('us-east-1');
	});

	it.each([
		['arn:aws:bedrock:eu-west-3:123456789012:inference-profile/eu.cohere.embed-v4:0', 'eu-west-3'],
		['arn:aws-cn:bedrock:cn-north-1:123456789012:inference-profile/cn.x', 'cn-north-1'],
		['arn:aws-us-gov:bedrock:us-gov-west-1::foundation-model/x', 'us-gov-west-1'],
	])('extracts and returns the region from %s', (modelArn, expected) => {
		expect(resolveBedrockRegion(modelArn, credentialRegion)).toBe(expected);
	});

	it('throws for an ARN whose region is not supported', () => {
		expect(() =>
			resolveBedrockRegion(
				'arn:aws:bedrock:not-a-region:123456789012:inference-profile/x',
				credentialRegion,
			),
		).toThrow();
	});
});
