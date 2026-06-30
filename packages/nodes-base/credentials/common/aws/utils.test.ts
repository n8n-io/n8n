import { UserError } from 'n8n-workflow';
import type { AWSRegion } from './regions';
import type { AwsAssumeRoleCredentialsType, AwsIamCredentialsType } from './types';

// Mock the SDK provider factory. Each call returns a function identity we can
// inspect, mirroring nodes-langchain's resolveAwsCredentials.test.ts pattern.
const { mockProvider, mockFromTemporaryCredentials } = vi.hoisted(() => {
	const mockProvider = vi.fn().mockResolvedValue({
		accessKeyId: 'assumed-access-key',
		secretAccessKey: 'assumed-secret-key',
		sessionToken: 'assumed-session-token',
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

vi.mock('aws4', () => ({
	sign: vi.fn(),
}));

import { assertSupportedAwsRegion, assumeRole, awsGetSignInOptionsAndUpdateRequest } from './utils';
import * as systemCredentialsUtils from './system-credentials-utils';

type FromTemporaryCredentialsCallArg = {
	params: { RoleArn: string; RoleSessionName: string; ExternalId: string };
	masterCredentials: unknown;
	clientConfig: { region: string; requestHandler?: unknown };
};

function lastCallArg(): FromTemporaryCredentialsCallArg {
	const calls = mockFromTemporaryCredentials.mock.calls;
	return calls[calls.length - 1][0] as FromTemporaryCredentialsCallArg;
}

// `masterCredentials` is always passed as a provider function; invoke it to read
// the resolved identity the SDK would receive.
async function resolvedMaster(): Promise<unknown> {
	const provider = lastCallArg().masterCredentials as () => Promise<unknown>;
	return await provider();
}

describe('assumeRole', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockResolveProxyUrl.mockReturnValue(undefined);
		mockCreateHttpsProxyAgent.mockReturnValue({ type: 'mock-https-agent' });
		mockProvider.mockResolvedValue({
			accessKeyId: 'assumed-access-key',
			secretAccessKey: 'assumed-secret-key',
			sessionToken: 'assumed-session-token',
		});
		mockFromTemporaryCredentials.mockReturnValue(mockProvider);
	});

	describe('with system credentials', () => {
		it('passes an async masterCredentials function (refreshable provider) to the SDK', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: true,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'external-123',
				roleSessionName: 'test-session',
			};

			const mockSystemCredentials = {
				accessKeyId: 'system-access-key',
				secretAccessKey: 'system-secret-key',
				sessionToken: 'system-session-token',
				source: 'environment' as const,
			};

			vi.spyOn(systemCredentialsUtils, 'getSystemCredentials').mockResolvedValue(
				mockSystemCredentials,
			);

			const result = await assumeRole(credentials, 'us-east-1');

			expect(result).toEqual({
				accessKeyId: 'assumed-access-key',
				secretAccessKey: 'assumed-secret-key',
				sessionToken: 'assumed-session-token',
			});

			const arg = lastCallArg();
			expect(typeof arg.masterCredentials).toBe('function');

			// Simulate the SDK invoking the provider; system credentials are read fresh.
			const masterProvider = arg.masterCredentials as () => Promise<unknown>;
			await expect(masterProvider()).resolves.toEqual({
				accessKeyId: 'system-access-key',
				secretAccessKey: 'system-secret-key',
				sessionToken: 'system-session-token',
			});
			expect(systemCredentialsUtils.getSystemCredentials).toHaveBeenCalled();
		});

		it('omits sessionToken from masterCredentials when system creds have none', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: true,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'external-123',
				roleSessionName: 'test-session',
			};

			vi.spyOn(systemCredentialsUtils, 'getSystemCredentials').mockResolvedValue({
				accessKeyId: 'system-access-key',
				secretAccessKey: 'system-secret-key',
				source: 'environment' as const,
			});

			await assumeRole(credentials, 'us-east-1');

			const masterProvider = lastCallArg().masterCredentials as () => Promise<unknown>;
			await expect(masterProvider()).resolves.toEqual({
				accessKeyId: 'system-access-key',
				secretAccessKey: 'system-secret-key',
			});
		});

		it('throws UserError when system credentials are not available (provider invocation)', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: true,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'external-123',
				roleSessionName: 'test-session',
			};

			vi.spyOn(systemCredentialsUtils, 'getSystemCredentials').mockResolvedValue(null);

			await assumeRole(credentials, 'us-east-1');

			const masterProvider = lastCallArg().masterCredentials as () => Promise<unknown>;
			await expect(masterProvider()).rejects.toThrow(UserError);
			await expect(masterProvider()).rejects.toThrow(
				'System AWS credentials are required for role assumption',
			);
		});

		it('surfaces the original UserError message without double-wrapping', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			// Simulate a UserError propagating from the SDK (e.g. masterCredentials rejected).
			// assumeRole() must re-throw it unchanged, not wrap it in "STS AssumeRole failed: ...".
			mockProvider.mockRejectedValue(
				new UserError('System AWS credentials are required for role assumption.'),
			);

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(UserError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'System AWS credentials are required for role assumption.',
			);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.not.toThrow(
				'STS AssumeRole failed',
			);
		});
	});

	describe('with manual STS credentials', () => {
		it('passes a static masterCredentials object with sessionToken when provided', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'external-123',
				roleSessionName: 'test-session',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
				stsSessionToken: 'sts-session-token',
			};

			const result = await assumeRole(credentials, 'us-east-1');

			expect(result).toEqual({
				accessKeyId: 'assumed-access-key',
				secretAccessKey: 'assumed-secret-key',
				sessionToken: 'assumed-session-token',
			});

			expect(await resolvedMaster()).toEqual({
				accessKeyId: 'sts-access-key',
				secretAccessKey: 'sts-secret-key',
				sessionToken: 'sts-session-token',
			});
		});

		it('omits sessionToken when not provided', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'external-123',
				roleSessionName: 'test-session',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			await assumeRole(credentials, 'us-east-1');

			expect(await resolvedMaster()).toEqual({
				accessKeyId: 'sts-access-key',
				secretAccessKey: 'sts-secret-key',
			});
		});

		it('omits sessionToken when only whitespace', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'external-123',
				roleSessionName: 'test-session',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
				stsSessionToken: '   ',
			};

			await assumeRole(credentials, 'us-east-1');

			expect(await resolvedMaster()).toEqual({
				accessKeyId: 'sts-access-key',
				secretAccessKey: 'sts-secret-key',
			});
		});

		it('trims whitespace from STS credentials and session token', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'external-123',
				roleSessionName: 'test-session',
				stsAccessKeyId: '  sts-access-key  ',
				stsSecretAccessKey: '  sts-secret-key  ',
				stsSessionToken: '  sts-session-token  ',
			};

			await assumeRole(credentials, 'us-east-1');

			expect(await resolvedMaster()).toEqual({
				accessKeyId: 'sts-access-key',
				secretAccessKey: 'sts-secret-key',
				sessionToken: 'sts-session-token',
			});
		});

		it('throws when STS access key ID is missing', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'external-123',
				roleSessionName: 'test-session',
				stsSecretAccessKey: 'sts-secret-key',
			};

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(UserError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'STS Access Key ID is required when not using system credentials',
			);
		});

		it('throws when STS access key ID is whitespace-only', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'external-123',
				roleSessionName: 'test-session',
				stsAccessKeyId: '   ',
				stsSecretAccessKey: 'sts-secret-key',
			};

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(UserError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'STS Access Key ID is required when not using system credentials',
			);
		});

		it('throws when STS secret access key is missing', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'external-123',
				roleSessionName: 'test-session',
				stsAccessKeyId: 'sts-access-key',
			};

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(UserError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'STS Secret Access Key is required when not using system credentials',
			);
		});

		it('throws when STS secret access key is whitespace-only', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'external-123',
				roleSessionName: 'test-session',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: '   ',
			};

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(UserError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'STS Secret Access Key is required when not using system credentials',
			);
		});
	});

	describe('SDK params', () => {
		it('passes trimmed RoleArn, RoleSessionName, ExternalId to the SDK', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: '  arn:aws:iam::123456789012:role/TestRole  ',
				externalId: '  external-123  ',
				roleSessionName: '  test-session  ',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			await assumeRole(credentials, 'us-east-1');

			expect(lastCallArg().params).toEqual({
				RoleArn: 'arn:aws:iam::123456789012:role/TestRole',
				RoleSessionName: 'test-session',
				ExternalId: 'external-123',
			});
		});
	});

	describe('return shape', () => {
		it('returns sessionToken as empty string when SDK returns undefined', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'external-123',
				roleSessionName: 'test-session',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			mockProvider.mockResolvedValueOnce({
				accessKeyId: 'assumed-access-key',
				secretAccessKey: 'assumed-secret-key',
				// sessionToken intentionally absent
			});

			const result = await assumeRole(credentials, 'us-east-1');

			expect(result).toEqual({
				accessKeyId: 'assumed-access-key',
				secretAccessKey: 'assumed-secret-key',
				sessionToken: '',
			});
		});
	});

	describe('proxy handling', () => {
		const baseCredentials: AwsAssumeRoleCredentialsType = {
			region: 'us-east-1',
			customEndpoints: false,
			useSystemCredentialsForRole: false,
			roleArn: 'arn:aws:iam::123456789012:role/TestRole',
			externalId: 'external-123',
			roleSessionName: 'test-session',
			stsAccessKeyId: 'sts-access-key',
			stsSecretAccessKey: 'sts-secret-key',
		};

		it('calls resolveProxyUrl with the concrete STS endpoint', async () => {
			await assumeRole(baseCredentials, 'us-east-1');
			expect(mockResolveProxyUrl).toHaveBeenCalledWith('https://sts.us-east-1.amazonaws.com');
		});

		it('uses a plain timeout object (no NodeHttpHandler) when no proxy is configured', async () => {
			mockResolveProxyUrl.mockReturnValue(undefined);
			await assumeRole(baseCredentials, 'us-east-1');

			expect(mockCreateHttpsProxyAgent).not.toHaveBeenCalled();
			expect(MockNodeHttpHandler).not.toHaveBeenCalled();
			expect(lastCallArg().clientConfig.requestHandler).toEqual({
				requestTimeout: 2000,
				connectionTimeout: 2000,
			});
		});

		it('builds a NodeHttpHandler with a proxy agent when a proxy is configured', async () => {
			const proxyAgent = { type: 'mock-https-agent' };
			mockResolveProxyUrl.mockReturnValue('http://proxy.example.com:8080');
			mockCreateHttpsProxyAgent.mockReturnValue(proxyAgent);

			await assumeRole(baseCredentials, 'us-east-1');

			expect(mockCreateHttpsProxyAgent).toHaveBeenCalledWith(
				'https://sts.us-east-1.amazonaws.com',
				'http://proxy.example.com:8080',
			);
			expect(MockNodeHttpHandler).toHaveBeenCalledTimes(1);
			expect(MockNodeHttpHandler).toHaveBeenCalledWith({
				httpAgent: proxyAgent,
				httpsAgent: proxyAgent,
			});
			expect(lastCallArg().clientConfig.requestHandler).toBeDefined();
		});

		it('reuses a single proxy agent for both http and https slots', async () => {
			mockResolveProxyUrl.mockReturnValue('http://proxy.example.com:8080');
			await assumeRole(baseCredentials, 'us-east-1');

			// One agent created, not two.
			expect(mockCreateHttpsProxyAgent).toHaveBeenCalledTimes(1);
		});
	});

	describe('region handling', () => {
		const credentialsFor = (region: AWSRegion): AwsAssumeRoleCredentialsType => ({
			region,
			customEndpoints: false,
			useSystemCredentialsForRole: false,
			roleArn: 'arn:aws:iam::123456789012:role/TestRole',
			externalId: 'external-123',
			roleSessionName: 'test-session',
			stsAccessKeyId: 'sts-access-key',
			stsSecretAccessKey: 'sts-secret-key',
		});

		it('uses the standard amazonaws.com STS host for standard regions', async () => {
			await assumeRole(credentialsFor('eu-west-1'), 'eu-west-1');
			expect(mockResolveProxyUrl).toHaveBeenCalledWith('https://sts.eu-west-1.amazonaws.com');
			expect(lastCallArg().clientConfig.region).toBe('eu-west-1');
		});

		it('uses the amazonaws.com.cn STS host for China regions', async () => {
			await assumeRole(credentialsFor('cn-north-1' as AWSRegion), 'cn-north-1' as AWSRegion);
			expect(mockResolveProxyUrl).toHaveBeenCalledWith('https://sts.cn-north-1.amazonaws.com.cn');
			expect(lastCallArg().clientConfig.region).toBe('cn-north-1');
		});

		it('uses the amazonaws.com STS host for GovCloud regions', async () => {
			await assumeRole(credentialsFor('us-gov-west-1'), 'us-gov-west-1');
			expect(mockResolveProxyUrl).toHaveBeenCalledWith('https://sts.us-gov-west-1.amazonaws.com');
			expect(lastCallArg().clientConfig.region).toBe('us-gov-west-1');
		});
	});

	describe('field validation', () => {
		const baseCredentials: AwsAssumeRoleCredentialsType = {
			region: 'us-east-1',
			customEndpoints: false,
			useSystemCredentialsForRole: false,
			roleArn: 'arn:aws:iam::123456789012:role/TestRole',
			externalId: 'external-123',
			roleSessionName: 'test-session',
			stsAccessKeyId: 'sts-access-key',
			stsSecretAccessKey: 'sts-secret-key',
		};

		it('throws when roleArn is missing', async () => {
			await expect(assumeRole({ ...baseCredentials, roleArn: '' }, 'us-east-1')).rejects.toThrow(
				'Role ARN is required when assuming a role.',
			);
		});

		it('omits ExternalId from params when externalId is absent', async () => {
			await assumeRole({ ...baseCredentials, externalId: '' }, 'us-east-1');
			expect(lastCallArg().params).not.toHaveProperty('ExternalId');
		});

		it('defaults RoleSessionName to n8n-session when roleSessionName is absent', async () => {
			await assumeRole({ ...baseCredentials, roleSessionName: '' }, 'us-east-1');
			expect(lastCallArg().params.RoleSessionName).toBe('n8n-session');
		});
	});

	describe('default values', () => {
		it('defaults useSystemCredentialsForRole to false when not provided', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'external-123',
				roleSessionName: 'test-session',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			await assumeRole(credentials, 'us-east-1');

			expect(await resolvedMaster()).toEqual({
				accessKeyId: 'sts-access-key',
				secretAccessKey: 'sts-secret-key',
			});
		});
	});

	describe('region validation', () => {
		it.each(['@example.com#', 'us-fake-1', '', 'us-east-1/foo', 'us-east-1#frag'])(
			'rejects unsupported region value %s before calling the SDK',
			async (region) => {
				const credentials: AwsAssumeRoleCredentialsType = {
					region: 'us-east-1',
					customEndpoints: false,
					useSystemCredentialsForRole: false,
					roleArn: 'arn:aws:iam::123456789012:role/TestRole',
					stsAccessKeyId: 'sts-access-key',
					stsSecretAccessKey: 'sts-secret-key',
				};

				await expect(assumeRole(credentials, region as AWSRegion)).rejects.toThrow(UserError);
				await expect(assumeRole(credentials, region as AWSRegion)).rejects.toThrow(
					'Unsupported AWS region',
				);

				expect(mockFromTemporaryCredentials).not.toHaveBeenCalled();
				expect(mockResolveProxyUrl).not.toHaveBeenCalled();
			},
		);
	});
});

describe('assertSupportedAwsRegion', () => {
	it.each([
		['us-east-1'],
		['eu-west-1'],
		['ap-southeast-2'],
		['cn-north-1'],
		['us-gov-west-1'],
		['eu-central-2'],
	])('accepts the supported region %s', (region) => {
		expect(() => assertSupportedAwsRegion(region)).not.toThrow();
	});

	it.each([
		[''],
		['us-east'],
		['us-fake-1'],
		['US-EAST-1'],
		[' us-east-1'],
		['us-east-1 '],
		['us-east-1/foo'],
		['us-east-1?x=1'],
		['us-east-1#frag'],
		['us-east-1:8080'],
		['@example.com#'],
		['@example.com'],
		['example.com'],
		['169.254.169.254'],
		['localhost'],
	])('rejects unsupported region value %s', (region) => {
		expect(() => assertSupportedAwsRegion(region)).toThrow(UserError);
		expect(() => assertSupportedAwsRegion(region)).toThrow('Unsupported AWS region');
	});

	it.each([[undefined], [null], [0], [true], [{}], [['us-east-1']]])(
		'rejects non-string region value %s',
		(region) => {
			expect(() => assertSupportedAwsRegion(region)).toThrow(UserError);
		},
	);
});

describe('awsGetSignInOptionsAndUpdateRequest', () => {
	const baseCredentials: AwsIamCredentialsType = {
		region: 'us-east-1',
		customEndpoints: false,
		accessKeyId: 'AKIA-test',
		secretAccessKey: 'secret-test',
		temporaryCredentials: false,
	};

	it('builds an endpoint URL for a supported region without throwing', () => {
		const { url, signOpts } = awsGetSignInOptionsAndUpdateRequest(
			{ headers: {} } as any,
			baseCredentials,
			'/path',
			'GET',
			'lambda',
			'us-east-1',
		);

		expect(new URL(url).host).toBe('lambda.us-east-1.amazonaws.com');
		expect(signOpts.host).toBe('lambda.us-east-1.amazonaws.com');
		expect(signOpts.region).toBe('us-east-1');
	});

	it('uses the China domain for China regions', () => {
		const { url } = awsGetSignInOptionsAndUpdateRequest(
			{ headers: {} } as any,
			{ ...baseCredentials, region: 'cn-north-1' },
			'/path',
			'GET',
			'lambda',
			'cn-north-1',
		);

		expect(new URL(url).host).toBe('lambda.cn-north-1.amazonaws.com.cn');
	});

	it.each([
		'@example.com#',
		'us-east-1/foo',
		'us-east-1#frag',
		'us-east-1:8080',
		'us-fake-1',
		'',
		' us-east-1 ',
	])('rejects unsupported region value %s before any URL is built', (region) => {
		expect(() =>
			awsGetSignInOptionsAndUpdateRequest(
				{ headers: {} } as any,
				baseCredentials,
				'/path',
				'GET',
				'lambda',
				region as any,
			),
		).toThrow(UserError);
	});
});
