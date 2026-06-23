import { assumeRole } from '@credentials/common/aws/utils';
import type { AwsAssumeRoleCredentialsType } from '@credentials/common/aws/types';
import { UserError } from 'n8n-workflow';

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

	it('throws when externalId is missing', async () => {
		await expect(assumeRole(baseCredentials({ externalId: '' }), 'us-east-1')).rejects.toThrow(
			UserError,
		);
		await expect(assumeRole(baseCredentials({ externalId: '' }), 'us-east-1')).rejects.toThrow(
			'External ID is required when assuming a role.',
		);
	});

	it('throws when roleSessionName is missing', async () => {
		await expect(assumeRole(baseCredentials({ roleSessionName: '' }), 'us-east-1')).rejects.toThrow(
			UserError,
		);
		await expect(assumeRole(baseCredentials({ roleSessionName: '' }), 'us-east-1')).rejects.toThrow(
			'Role Session Name is required when assuming a role.',
		);
	});
});

// Mock global fetch so we can inspect dispatcher behavior without hitting the network.
const fetchMock = vi.fn();
beforeEach(() => {
	fetchMock.mockReset();
	// Return a minimal STS-success XML so assumeRole() completes.
	fetchMock.mockResolvedValue({
		ok: true,
		text: async () =>
			'<AssumeRoleResponse><AssumeRoleResult><Credentials>' +
			'<AccessKeyId>ASIATEST</AccessKeyId>' +
			'<SecretAccessKey>SECRET</SecretAccessKey>' +
			'<SessionToken>TOKEN</SessionToken>' +
			'</Credentials></AssumeRoleResult></AssumeRoleResponse>',
	});
	(globalThis as { fetch: unknown }).fetch = fetchMock as unknown as typeof fetch;
});

describe('assumeRole() — proxy-aware transport', () => {
	const originalEnv = { ...process.env };
	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it('passes an undici ProxyAgent dispatcher when HTTPS_PROXY is set', async () => {
		process.env.HTTPS_PROXY = 'http://proxy.example.com:3128';
		delete process.env.NO_PROXY;

		await assumeRole(baseCredentials(), 'us-east-1');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit & { dispatcher?: unknown }];
		expect(init.dispatcher).toBeDefined();
		expect((init.dispatcher as { constructor: { name: string } }).constructor.name).toBe(
			'ProxyAgent',
		);
	});

	it('does not pass a dispatcher when no proxy env var resolves', async () => {
		delete process.env.HTTPS_PROXY;
		delete process.env.HTTP_PROXY;
		delete process.env.NO_PROXY;

		await assumeRole(baseCredentials(), 'us-east-1');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit & { dispatcher?: unknown }];
		expect(init.dispatcher).toBeUndefined();
	});

	it('honors NO_PROXY for the STS host', async () => {
		process.env.HTTPS_PROXY = 'http://proxy.example.com:3128';
		process.env.NO_PROXY = '.amazonaws.com';

		await assumeRole(baseCredentials(), 'us-east-1');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit & { dispatcher?: unknown }];
		expect(init.dispatcher).toBeUndefined();
	});
});
