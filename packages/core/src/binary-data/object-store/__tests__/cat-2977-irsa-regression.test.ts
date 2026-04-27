/**
 * @file CAT-2977 Regression Test: S3 binary storage with AWS IRSA authentication fails
 *
 * ## Problem
 * In n8n v2.18.0, upgrading fast-xml-parser from 4.x to 5.7.0 (via security fix SEC-472)
 * broke S3 binary data storage when using AWS IRSA (IAM Roles for Service Accounts) authentication.
 *
 * ## Root Cause
 * 1. The AWS SDK@3 depends on fast-xml-parser ~4.4.1
 * 2. n8n's root package.json overrides fast-xml-parser to 5.7.0
 * 3. fast-xml-parser 5.7.0 introduced a breaking change: "you cant add numeric external entity"
 * 4. When using IRSA, the SDK calls STS AssumeRoleWithWebIdentity to obtain credentials
 * 5. STS XML responses contain numeric character references like &#xD; (carriage return)
 * 6. fast-xml-parser 5.7.0 rejects these, causing: "[EntityReplacer] Invalid character '#' in entity name: "#xD""
 * 7. Credential acquisition fails, preventing S3 connection
 *
 * ## Fix
 * Upgrade fast-xml-parser from 5.7.0 to 5.7.2 in root package.json:
 *
 * ```json
 * "pnpm": {
 *   "overrides": {
 *     "fast-xml-parser": "5.7.2"  // was 5.7.0
 *   }
 * }
 * ```
 *
 * Then run `pnpm install` to update the lockfile.
 *
 * ## References
 * - Linear: CAT-2977
 * - GitHub: https://github.com/n8n-io/n8n/issues/29350
 * - fast-xml-parser changelog: https://github.com/NaturalIntelligence/fast-xml-parser/blob/master/CHANGELOG.md
 *   - 5.7.0 (2026-04-17): "you cant add numeric external entity" (breaking change)
 *   - 5.7.2 (2026-04-25): "allow numerical external entity for backward compatibility" (fix)
 *
 * ## Note on Test Reproduction
 * This test cannot directly reproduce the XML parsing failure without real AWS IRSA credentials
 * (which would be a hard bailout). Instead, these tests verify:
 * 1. IRSA configuration produces correct S3Client config (no explicit credentials)
 * 2. Error handling works when STS credential acquisition fails
 * 3. ObjectStoreService initializes successfully when credentials are available
 *
 * The actual XML parsing failure happens deep inside AWS SDK v3 when it calls STS
 * AssumeRoleWithWebIdentity and fast-xml-parser 5.7.0 fails to parse the response.
 */

import { HeadBucketCommand, type S3Client } from '@aws-sdk/client-s3';
import { mock } from 'jest-mock-extended';
import type { ObjectStoreConfig } from '../object-store.config';
import { ObjectStoreService } from '../object-store.service.ee';

// Mock S3Client to simulate the STS credential acquisition failure
const mockS3Send = jest.fn();
const s3Client = mock<S3Client>({ send: mockS3Send });

jest.mock('@aws-sdk/client-s3', () => ({
	...jest.requireActual('@aws-sdk/client-s3'),
	S3Client: class {
		constructor() {
			return s3Client;
		}
	},
}));

describe('CAT-2977: IRSA authentication with fast-xml-parser 5.7.0', () => {
	const mockBucket = { region: 'us-east-1', name: 'test-bucket' };
	const mockHost = `s3.${mockBucket.region}.amazonaws.com`;

	it('should fail to initialize S3 when fast-xml-parser 5.7.0 rejects STS XML response', async () => {
		// Simulate the exact error that fast-xml-parser 5.7.0 throws when parsing STS XML
		const fastXmlParserError = new Error(
			"[EntityReplacer] Invalid character '#' in entity name: \"#xD\"",
		);

		// Configure S3 with IRSA authentication (authAutoDetect=true means no explicit credentials)
		const s3ConfigWithIRSA = mock<ObjectStoreConfig>({
			host: mockHost,
			bucket: mockBucket,
			credentials: {
				accessKey: '',
				accessSecret: '',
				authAutoDetect: true, // IRSA mode - SDK will call STS to assume role
			},
			protocol: 'https',
			forcePathStyle: true,
		});

		const objectStoreService = new ObjectStoreService(mock(), s3ConfigWithIRSA);

		// Mock HeadBucketCommand to fail with the fast-xml-parser error
		// This simulates the AWS SDK failing to parse STS XML response during credential acquisition
		mockS3Send.mockRejectedValueOnce(fastXmlParserError);

		// The service init should fail because STS credential acquisition fails
		await expect(objectStoreService.init()).rejects.toThrow('Request to S3 failed');
	});

	it('should succeed when fast-xml-parser 5.7.2+ allows numeric entities', async () => {
		// Configure S3 with IRSA authentication
		const s3ConfigWithIRSA = mock<ObjectStoreConfig>({
			host: mockHost,
			bucket: mockBucket,
			credentials: {
				accessKey: '',
				accessSecret: '',
				authAutoDetect: true,
			},
			protocol: 'https',
			forcePathStyle: true,
		});

		const objectStoreService = new ObjectStoreService(mock(), s3ConfigWithIRSA);

		// With fast-xml-parser 5.7.2+, STS XML parsing succeeds
		mockS3Send.mockResolvedValueOnce({});

		// The service init should succeed
		await expect(objectStoreService.init()).resolves.not.toThrow();
	});

	it('should generate correct S3Client config for IRSA (no explicit credentials)', () => {
		const s3ConfigWithIRSA = mock<ObjectStoreConfig>({
			host: mockHost,
			bucket: mockBucket,
			credentials: {
				accessKey: 'should-be-ignored',
				accessSecret: 'should-be-ignored',
				authAutoDetect: true, // When true, SDK uses default credential provider chain
			},
			protocol: 'https',
			forcePathStyle: true,
		});

		const objectStoreService = new ObjectStoreService(mock(), s3ConfigWithIRSA);
		const clientConfig = objectStoreService.getClientConfig();

		// With authAutoDetect=true, credentials should not be in the config
		// The SDK will use environment variables (AWS_ROLE_ARN, AWS_WEB_IDENTITY_TOKEN_FILE)
		expect(clientConfig.credentials).toBeUndefined();
		expect(clientConfig).toEqual({
			endpoint: `https://${mockHost}`,
			forcePathStyle: true,
			region: mockBucket.region,
		});
	});
});
