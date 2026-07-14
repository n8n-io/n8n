import { UserError, type IHttpRequestOptions } from 'n8n-workflow';

import type { AWSRegion } from './regions';
import * as systemCredentialsUtils from './system-credentials-utils';
import type { AwsAssumeRoleCredentialsType, AwsIamCredentialsType } from './types';
import {
	assertSupportedAwsRegion,
	assumeRole,
	awsGetSignInOptionsAndUpdateRequest,
	parseAwsUrl,
	validateBedrockEndpointOverride,
} from './utils';

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

describe('parseAwsUrl', () => {
	it('parses a PrivateLink (vpce) Bedrock host', () => {
		const url = new URL('https://vpce-0abc123.bedrock-runtime.us-east-1.vpce.amazonaws.com/model');
		expect(parseAwsUrl(url)).toEqual({ service: 'bedrock-runtime', region: 'us-east-1' });
	});

	it('parses a PrivateLink (vpce) host for a non-Bedrock service', () => {
		const url = new URL('https://vpce-0abc123.sqs.us-west-2.vpce.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'sqs', region: 'us-west-2' });
	});

	it('parses a PrivateLink (vpce) host whose vpce-id label includes an availability-zone suffix', () => {
		const url = new URL('https://vpce-0abc123-usw2-az1.sqs.us-west-2.vpce.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'sqs', region: 'us-west-2' });
	});

	it('extracts a vpce region label verbatim even when unsupported (validation is a call-site concern)', () => {
		const url = new URL('https://vpce-0abc.sqs.not-a-region.vpce.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'sqs', region: 'not-a-region' });
	});

	it('parses a PrivateLink (vpce) host in a GovCloud region', () => {
		const url = new URL('https://vpce-0abc123.sqs.us-gov-west-1.vpce.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'sqs', region: 'us-gov-west-1' });
	});

	it('parses a PrivateLink (vpce) host on the China domain', () => {
		const url = new URL('https://vpce-0abc123.sqs.cn-north-1.vpce.amazonaws.com.cn/');
		expect(parseAwsUrl(url)).toEqual({ service: 'sqs', region: 'cn-north-1' });
	});

	it('parses a standard public hostname (regression)', () => {
		const url = new URL('https://lambda.us-east-1.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'lambda', region: 'us-east-1' });
	});

	it('parses a China domain hostname (regression)', () => {
		const url = new URL('https://lambda.cn-north-1.amazonaws.com.cn/');
		expect(parseAwsUrl(url)).toEqual({ service: 'lambda', region: 'cn-north-1' });
	});

	it('returns a null region for a global no-region service (regression)', () => {
		const url = new URL('https://iam.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'iam', region: null });
	});
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

	it('signs and sends UI Query Parameters supplied via qs (not only qs.query)', () => {
		const { url, signOpts } = awsGetSignInOptionsAndUpdateRequest(
			{
				uri: 'https://bedrock.us-east-1.amazonaws.com/foundation-models',
				qs: { byProvider: 'anthropic', byOutputModality: 'TEXT' },
				headers: {},
			} as any,
			baseCredentials,
			'',
			'GET',
			'bedrock',
			'us-east-1',
		);

		// Present in the outgoing URL...
		const sentUrl = new URL(url);
		expect(sentUrl.searchParams.get('byProvider')).toBe('anthropic');
		expect(sentUrl.searchParams.get('byOutputModality')).toBe('TEXT');
		// ...and in the signed path, so they are part of the SigV4 canonical request.
		expect(signOpts.path).toContain('byProvider=anthropic');
		expect(signOpts.path).toContain('byOutputModality=TEXT');
	});

	it('keeps query parameters embedded directly in the URL', () => {
		const { url, signOpts } = awsGetSignInOptionsAndUpdateRequest(
			{
				uri: 'https://bedrock.us-east-1.amazonaws.com/foundation-models?byProvider=amazon',
				headers: {},
			} as any,
			baseCredentials,
			'',
			'GET',
			'bedrock',
			'us-east-1',
		);

		expect(new URL(url).searchParams.get('byProvider')).toBe('amazon');
		expect(signOpts.path).toContain('byProvider=amazon');
	});

	it('preserves the STS GetCallerIdentity special case', () => {
		const { url } = awsGetSignInOptionsAndUpdateRequest(
			{
				uri: 'https://sts.us-east-1.amazonaws.com/',
				qs: { Action: 'GetCallerIdentity' },
				headers: {},
			} as any,
			baseCredentials,
			'',
			'POST',
			'sts',
			'us-east-1',
		);

		const sentUrl = new URL(url);
		expect(sentUrl.searchParams.get('Action')).toBe('GetCallerIdentity');
		expect(sentUrl.searchParams.get('Version')).toBe('2011-06-15');
	});

	describe('Bedrock control-plane endpoint override', () => {
		// The model-list loadOptions request arrives with the default control-plane
		// host as baseURL and no explicit signing service (service is derived from
		// the host). These exercise that exact shape.
		const modelListRequest: IHttpRequestOptions = {
			baseURL: 'https://bedrock.us-east-1.amazonaws.com',
			url: '/foundation-models?byOutputModality=TEXT',
			headers: {},
		};

		it('routes the request to the override host when set', () => {
			const { url, signOpts } = awsGetSignInOptionsAndUpdateRequest(
				modelListRequest,
				{
					...baseCredentials,
					bedrockEndpoint: 'https://vpce-abc.bedrock.us-east-1.vpce.amazonaws.com',
				},
				'',
				'GET',
				'',
				'us-east-1',
			);

			const sent = new URL(url);
			expect(sent.host).toBe('vpce-abc.bedrock.us-east-1.vpce.amazonaws.com');
			expect(sent.pathname).toBe('/foundation-models');
			expect(sent.searchParams.get('byOutputModality')).toBe('TEXT');
			// A custom host must never change the signing name or region.
			expect(signOpts.service).toBe('bedrock');
			expect(signOpts.region).toBe('us-east-1');
			expect(signOpts.host).toBe('vpce-abc.bedrock.us-east-1.vpce.amazonaws.com');
		});

		it('substitutes the {region} placeholder in the override', () => {
			const { url } = awsGetSignInOptionsAndUpdateRequest(
				modelListRequest,
				{ ...baseCredentials, bedrockEndpoint: 'https://bedrock.{region}.example.internal' },
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(new URL(url).host).toBe('bedrock.us-east-1.example.internal');
		});

		it('prepends any base path on the override endpoint', () => {
			const { url } = awsGetSignInOptionsAndUpdateRequest(
				modelListRequest,
				{ ...baseCredentials, bedrockEndpoint: 'https://proxy.internal/bedrock/' },
				'',
				'GET',
				'',
				'us-east-1',
			);

			const sent = new URL(url);
			expect(sent.host).toBe('proxy.internal');
			expect(sent.pathname).toBe('/bedrock/foundation-models');
		});

		it('hits the default control-plane host when no override is set', () => {
			const { url, signOpts } = awsGetSignInOptionsAndUpdateRequest(
				modelListRequest,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(new URL(url).host).toBe('bedrock.us-east-1.amazonaws.com');
			expect(signOpts.service).toBe('bedrock');
			expect(signOpts.region).toBe('us-east-1');
		});

		it('rejects an override with a non-http scheme', () => {
			expect(() =>
				awsGetSignInOptionsAndUpdateRequest(
					modelListRequest,
					{ ...baseCredentials, bedrockEndpoint: 'ftp://bedrock.us-east-1.amazonaws.com' },
					'',
					'GET',
					'',
					'us-east-1',
				),
			).toThrow(UserError);
		});
	});

	describe('PrivateLink (vpce) endpoints', () => {
		it('normalizes a vpce Bedrock host to the bedrock signing service (uri branch)', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://vpce-0abc123.bedrock-runtime.us-east-1.vpce.amazonaws.com/foundation-models',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('bedrock');
			expect(signOpts.region).toBe('us-east-1');
		});

		it('normalizes a vpce Bedrock host to the bedrock signing service (baseURL/url branch)', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					baseURL: 'https://vpce-0abc123.bedrock-runtime.us-east-1.vpce.amazonaws.com',
					url: '/foundation-models',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('bedrock');
			expect(signOpts.region).toBe('us-east-1');
		});

		it('signs a vpce host for a non-Bedrock service using its own service name', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					baseURL: 'https://vpce-0abc123.sqs.us-west-2.vpce.amazonaws.com',
					url: '/',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-west-2',
			);

			expect(signOpts.service).toBe('sqs');
			expect(signOpts.region).toBe('us-west-2');
		});

		it('throws when the vpce host has an unsupported region label', () => {
			expect(() =>
				awsGetSignInOptionsAndUpdateRequest(
					{
						baseURL: 'https://vpce-0abc123.sqs.not-a-region.vpce.amazonaws.com',
						url: '/',
						headers: {},
					} as any,
					baseCredentials,
					'',
					'GET',
					'',
					'us-east-1',
				),
			).toThrow('not-a-region');
		});

		it('does not overwrite an explicitly supplied service with the URL-derived one', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					baseURL: 'https://vpce-0abc123.sqs.us-west-2.vpce.amazonaws.com',
					url: '/',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'custom-service',
				'us-west-2',
			);

			expect(signOpts.service).toBe('custom-service');
		});

		it('always populates signOpts.service for a vpce host (protects the signOptions fallback invariant)', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					baseURL: 'https://vpce-0abc123.bedrock-runtime.us-east-1.vpce.amazonaws.com',
					url: '/foundation-models',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			// signOptions falls back to splitting the raw hostname when service is
			// nullish; asserting the resolved value proves that fallback never fires.
			expect(signOpts.service).toBe('bedrock');
		});
	});

	describe('custom (non-AWS) endpoint hosts', () => {
		it('keeps the credential region when the host label is not a region (uri branch)', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://myapi.example.com/prod/resource',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'execute-api',
				'us-east-1',
			);

			expect(signOpts.region).toBe('us-east-1');
		});

		it('keeps the credential region when the host label is not a region (baseURL/url branch)', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					baseURL: 'https://sqs.mycompany.dev',
					url: '/queue',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'eu-central-1',
			);

			expect(signOpts.region).toBe('eu-central-1');
			expect(signOpts.service).toBe('sqs');
		});

		it('adopts a recognized region label from a custom host', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://sqs.us-west-2.mycompany.dev/queue',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.region).toBe('us-west-2');
		});
	});
});

describe('validateBedrockEndpointOverride', () => {
	it('accepts an https URL and returns it without a trailing slash', () => {
		expect(
			validateBedrockEndpointOverride('https://bedrock.us-east-1.amazonaws.com', 'us-east-1'),
		).toBe('https://bedrock.us-east-1.amazonaws.com');
	});

	it('accepts an http URL (for LocalStack / on-prem gateways)', () => {
		expect(validateBedrockEndpointOverride('http://localhost:4566', 'us-east-1')).toBe(
			'http://localhost:4566',
		);
	});

	it('substitutes the {region} placeholder', () => {
		expect(
			validateBedrockEndpointOverride(
				'https://bedrock-runtime.{region}.example.internal',
				'eu-west-3',
			),
		).toBe('https://bedrock-runtime.eu-west-3.example.internal');
	});

	it('strips a trailing slash but preserves a meaningful base path', () => {
		expect(validateBedrockEndpointOverride('https://proxy.internal/bedrock/', 'us-east-1')).toBe(
			'https://proxy.internal/bedrock',
		);
	});

	it.each(['ftp://bedrock.us-east-1.amazonaws.com', 'file:///etc/passwd', 'ws://host'])(
		'rejects the non-http(s) scheme %s',
		(endpoint) => {
			expect(() => validateBedrockEndpointOverride(endpoint, 'us-east-1')).toThrow(UserError);
		},
	);

	it('rejects a malformed URL', () => {
		expect(() => validateBedrockEndpointOverride('not a url', 'us-east-1')).toThrow(UserError);
	});

	it('rejects an unsupported region before substitution', () => {
		expect(() =>
			validateBedrockEndpointOverride(
				'https://bedrock.{region}.amazonaws.com',
				'us-fake-1' as AWSRegion,
			),
		).toThrow(UserError);
	});
});
