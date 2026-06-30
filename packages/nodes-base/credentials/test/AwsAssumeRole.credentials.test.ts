import { sign } from 'aws4';
import type { IHttpRequestOptions } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { AwsAssumeRole } from '../AwsAssumeRole.credentials';
import type { AwsAssumeRoleCredentialsType } from '../common/aws/types';

// Mock the SDK provider factory so assumeRole() doesn't make a real STS call.
// Match the structure of nodes-langchain's resolveAwsCredentials.test.ts.
const { mockProvider, mockFromTemporaryCredentials } = vi.hoisted(() => {
	const mockProvider = vi.fn().mockResolvedValue({
		accessKeyId: 'ASSUMED-KEY',
		secretAccessKey: 'ASSUMED-SECRET',
		sessionToken: 'ASSUMED-SESSION',
	});
	const mockFromTemporaryCredentials = vi.fn().mockReturnValue(mockProvider);
	return { mockProvider, mockFromTemporaryCredentials };
});

vi.mock('@aws-sdk/credential-providers', () => ({
	fromTemporaryCredentials: mockFromTemporaryCredentials,
}));

vi.mock('@n8n/backend-network/proxy', () => ({
	resolveProxyUrl: vi.fn().mockReturnValue(undefined),
	createHttpsProxyAgent: vi.fn(),
}));

vi.mock('@smithy/node-http-handler', () => ({
	NodeHttpHandler: vi.fn(),
}));

vi.mock('aws4', () => ({
	sign: vi.fn(),
}));

describe('AwsAssumeRole Credential', () => {
	const aws = new AwsAssumeRole();
	let mockSign: Mock;

	const credentials: AwsAssumeRoleCredentialsType = {
		region: 'us-east-1',
		customEndpoints: false,
		roleArn: 'arn:aws:iam::123456789012:role/MyRole',
		externalId: 'ext-id',
		roleSessionName: 'n8n-session',
		stsAccessKeyId: 'sts-key',
		stsSecretAccessKey: 'sts-secret',
		useSystemCredentialsForRole: false,
	};

	beforeEach(() => {
		mockSign = sign as unknown as Mock;
		mockProvider.mockResolvedValue({
			accessKeyId: 'ASSUMED-KEY',
			secretAccessKey: 'ASSUMED-SECRET',
			sessionToken: 'ASSUMED-SESSION',
		});
		mockFromTemporaryCredentials.mockReturnValue(mockProvider);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should sign Bedrock requests with the bedrock service namespace', async () => {
		const requestOptions: IHttpRequestOptions = {
			qs: {},
			body: {},
			headers: {},
			baseURL: '',
			url: 'https://bedrock-runtime.us-east-1.amazonaws.com/model/anthropic.claude-v2/invoke',
			method: 'POST',
		};

		await aws.authenticate(credentials, requestOptions);

		const finalCall = mockSign.mock.calls.at(-1);
		expect(finalCall?.[0]).toEqual(
			expect.objectContaining({
				host: 'bedrock-runtime.us-east-1.amazonaws.com',
				region: 'us-east-1',
				service: 'bedrock',
			}),
		);
	});
});
