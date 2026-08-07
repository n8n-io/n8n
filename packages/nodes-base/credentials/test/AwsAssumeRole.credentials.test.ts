import type { IHttpRequestOptions } from 'n8n-workflow';

import { AwsAssumeRole } from '../AwsAssumeRole.credentials';
import type { AwsAssumeRoleCredentialsType } from '../common/aws/types';

// Mock the SDK provider factory so assumeRole() doesn't make a real STS call.
const { mockProvider, mockFromTemporaryCredentials, mockSmithySignFn, MockSignatureV4 } =
	vi.hoisted(() => {
		const mockProvider = vi.fn().mockResolvedValue({
			accessKeyId: 'ASSUMED-KEY',
			secretAccessKey: 'ASSUMED-SECRET',
			sessionToken: 'ASSUMED-SESSION',
		});
		const mockFromTemporaryCredentials = vi.fn().mockReturnValue(mockProvider);
		const mockSmithySignFn = vi.fn();
		const MockSignatureV4 = vi.fn(function (this: { sign: typeof mockSmithySignFn }) {
			this.sign = mockSmithySignFn;
		});
		return { mockProvider, mockFromTemporaryCredentials, mockSmithySignFn, MockSignatureV4 };
	});

vi.mock('@aws-sdk/credential-providers', () => ({
	fromTemporaryCredentials: mockFromTemporaryCredentials,
}));

vi.mock('@smithy/signature-v4', () => ({
	SignatureV4: MockSignatureV4,
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
		mockSmithySignFn.mockResolvedValue({ headers: {} });
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

		// assumeRole uses fromTemporaryCredentials (SDK); signOptions uses SignatureV4 directly.
		// Verify signOptions received the bedrock service namespace.
		expect(MockSignatureV4).toHaveBeenLastCalledWith(
			expect.objectContaining({
				region: 'us-east-1',
				service: 'bedrock',
			}),
		);
		expect(mockSmithySignFn).toHaveBeenLastCalledWith(
			expect.objectContaining({
				hostname: 'bedrock-runtime.us-east-1.amazonaws.com',
			}),
		);
	});

	it('should sign a vpce Bedrock request with the bedrock service namespace', async () => {
		const requestOptions: IHttpRequestOptions = {
			qs: {},
			body: {},
			headers: {},
			baseURL: '',
			url: 'https://vpce-0abc123.bedrock-runtime.us-east-1.vpce.amazonaws.com/model/anthropic.claude-v2/invoke',
			method: 'POST',
		};

		await aws.authenticate(credentials, requestOptions);

		expect(MockSignatureV4).toHaveBeenLastCalledWith(
			expect.objectContaining({
				region: 'us-east-1',
				service: 'bedrock',
			}),
		);
		expect(mockSmithySignFn).toHaveBeenLastCalledWith(
			expect.objectContaining({
				hostname: 'vpce-0abc123.bedrock-runtime.us-east-1.vpce.amazonaws.com',
			}),
		);
	});

	it('should sign a vpce host for a non-Bedrock service using its own service name', async () => {
		const requestOptions: IHttpRequestOptions = {
			qs: {},
			body: {},
			headers: {},
			baseURL: '',
			url: 'https://vpce-0abc123.sqs.us-west-2.vpce.amazonaws.com/',
			method: 'POST',
		};

		await aws.authenticate(credentials, requestOptions);

		expect(MockSignatureV4).toHaveBeenLastCalledWith(
			expect.objectContaining({
				region: 'us-west-2',
				service: 'sqs',
			}),
		);
	});

	it('should throw when the vpce host has an unsupported region label', async () => {
		const requestOptions: IHttpRequestOptions = {
			qs: {},
			body: {},
			headers: {},
			baseURL: '',
			url: 'https://vpce-0abc123.sqs.not-a-region.vpce.amazonaws.com/',
			method: 'POST',
		};

		await expect(aws.authenticate(credentials, requestOptions)).rejects.toThrow('not-a-region');
	});
});
