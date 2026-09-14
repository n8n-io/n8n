import { assumeRole } from '@credentials/common/aws/utils';
import type { AwsAssumeRoleCredentialsType } from '@credentials/common/aws/types';
import { UserError } from 'n8n-workflow';

// `assumeRole` now delegates STS to the AWS SDK's `fromTemporaryCredentials`.
// Proxy is built from `@n8n/backend-network/proxy` + `@smithy/node-http-handler`.
const { mockProvider, mockFromTemporaryCredentials } = vi.hoisted(() => {
	const mockProvider = vi.fn().mockResolvedValue({
		accessKeyId: 'ASIATEST',
		secretAccessKey: 'SECRET',
		sessionToken: 'TOKEN',
	});
	const mockFromTemporaryCredentials = vi.fn().mockReturnValue(mockProvider);
	return { mockProvider, mockFromTemporaryCredentials };
});

vi.mock('@aws-sdk/credential-providers', () => ({
	fromTemporaryCredentials: mockFromTemporaryCredentials,
}));

const { mockResolveProxyUrl, mockCreateHttpsProxyAgent } = vi.hoisted(() => ({
	mockResolveProxyUrl: vi.fn().mockReturnValue(undefined),
	mockCreateHttpsProxyAgent: vi.fn().mockReturnValue({ type: 'mock-https-agent' }),
}));

vi.mock('@n8n/backend-network/proxy', () => ({
	resolveProxyUrl: mockResolveProxyUrl,
	createHttpsProxyAgent: mockCreateHttpsProxyAgent,
}));

const { MockNodeHttpHandler } = vi.hoisted(() => ({
	MockNodeHttpHandler: vi.fn(),
}));

vi.mock('@smithy/node-http-handler', () => ({
	NodeHttpHandler: MockNodeHttpHandler,
}));

function baseCredentials(
	overrides: Partial<AwsAssumeRoleCredentialsType> = {},
): AwsAssumeRoleCredentialsType {
	return {
		region: 'us-east-1',
		customEndpoints: false,
		roleArn: 'arn:aws:iam::123456789012:role/TestRole',
		externalId: 'external-id-value',
		roleSessionName: 'n8n-session',
		stsAccessKeyId: 'AKIA_TEST',
		stsSecretAccessKey: 'secret-value',
		useSystemCredentialsForRole: false,
		...overrides,
	};
}

describe('assumeRole() — centralized validation', () => {
	it('throws when roleArn is missing', async () => {
		await expect(assumeRole(baseCredentials({ roleArn: '' }), 'us-east-1')).rejects.toThrow(
			UserError,
		);
		await expect(assumeRole(baseCredentials({ roleArn: '' }), 'us-east-1')).rejects.toThrow(
			'Role ARN is required when assuming a role.',
		);
	});

	it('throws when roleArn is whitespace-only', async () => {
		await expect(assumeRole(baseCredentials({ roleArn: '   ' }), 'us-east-1')).rejects.toThrow(
			UserError,
		);
		await expect(assumeRole(baseCredentials({ roleArn: '   ' }), 'us-east-1')).rejects.toThrow(
			'Role ARN is required when assuming a role.',
		);
	});

	it('omits ExternalId from params when externalId is absent', async () => {
		await assumeRole(baseCredentials({ externalId: '' }), 'us-east-1');
		const sdkArg = mockFromTemporaryCredentials.mock.calls.at(-1)?.[0] as {
			params: Record<string, unknown>;
		};
		expect(sdkArg.params).not.toHaveProperty('ExternalId');
	});

	it('defaults RoleSessionName to n8n-session when roleSessionName is absent', async () => {
		await assumeRole(baseCredentials({ roleSessionName: '' }), 'us-east-1');
		const sdkArg = mockFromTemporaryCredentials.mock.calls.at(-1)?.[0] as {
			params: { RoleSessionName: string };
		};
		expect(sdkArg.params.RoleSessionName).toBe('n8n-session');
	});
});

describe('assumeRole() — proxy-aware client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockResolveProxyUrl.mockReturnValue(undefined);
		mockCreateHttpsProxyAgent.mockReturnValue({ type: 'mock-https-agent' });
		mockProvider.mockResolvedValue({
			accessKeyId: 'ASIATEST',
			secretAccessKey: 'SECRET',
			sessionToken: 'TOKEN',
		});
		mockFromTemporaryCredentials.mockReturnValue(mockProvider);
	});

	it('resolves the proxy URL against the concrete STS endpoint', async () => {
		await assumeRole(baseCredentials(), 'us-east-1');

		expect(mockResolveProxyUrl).toHaveBeenCalledWith('https://sts.us-east-1.amazonaws.com');
	});

	it('builds a NodeHttpHandler and passes it to the SDK when a proxy is configured', async () => {
		const proxyAgent = { type: 'mock-https-agent' };
		mockResolveProxyUrl.mockReturnValue('http://proxy.example.com:8080');
		mockCreateHttpsProxyAgent.mockReturnValue(proxyAgent);

		await assumeRole(baseCredentials(), 'us-east-1');

		expect(mockCreateHttpsProxyAgent).toHaveBeenCalledWith(
			'https://sts.us-east-1.amazonaws.com',
			'http://proxy.example.com:8080',
		);
		expect(MockNodeHttpHandler).toHaveBeenCalledWith({
			httpAgent: proxyAgent,
			httpsAgent: proxyAgent,
		});

		const sdkArg = mockFromTemporaryCredentials.mock.calls.at(-1)?.[0] as {
			clientConfig: { requestHandler?: unknown };
		};
		expect(sdkArg.clientConfig.requestHandler).toBeDefined();
	});

	it('uses a plain timeout object (no NodeHttpHandler) when no proxy applies', async () => {
		mockResolveProxyUrl.mockReturnValue(undefined);

		await assumeRole(baseCredentials(), 'us-east-1');

		expect(MockNodeHttpHandler).not.toHaveBeenCalled();
		const sdkArg = mockFromTemporaryCredentials.mock.calls.at(-1)?.[0] as {
			clientConfig: { requestHandler?: unknown; maxAttempts?: number };
		};
		expect(sdkArg.clientConfig.requestHandler).toEqual({
			requestTimeout: 2000,
			connectionTimeout: 2000,
		});
		expect(sdkArg.clientConfig.maxAttempts).toBe(1);
	});

	it('wraps SDK-level errors in UserError', async () => {
		mockProvider.mockRejectedValue(
			new Error('AccessDenied: User is not authorized to assume role'),
		);

		await expect(assumeRole(baseCredentials(), 'us-east-1')).rejects.toThrow(UserError);
		await expect(assumeRole(baseCredentials(), 'us-east-1')).rejects.toThrow(
			'STS AssumeRole failed: AccessDenied: User is not authorized to assume role',
		);
	});
});
