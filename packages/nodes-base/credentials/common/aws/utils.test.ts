import { UserError, type IHttpRequestOptions } from 'n8n-workflow';

import { regions, type AWSRegion } from './regions';
import * as systemCredentialsUtils from './system-credentials-utils';
import type { AwsAssumeRoleCredentialsType, AwsIamCredentialsType } from './types';
import {
	assertSupportedAwsRegion,
	assumeRole,
	AWS_REGION_SHAPE_PATTERN,
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

	it('keeps the vpce branch positional even when the service label is region-like', () => {
		const url = new URL('https://vpce-0abc123.us-east-1.us-west-2.vpce.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'us-east-1', region: 'us-west-2' });
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

	it('parses a dual-stack hostname', () => {
		const url = new URL('https://s3.dualstack.us-east-1.amazonaws.com/bucket/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: 'us-east-1' });
	});

	it('parses a dual-stack hostname on the China domain', () => {
		const url = new URL('https://s3.dualstack.cn-north-1.amazonaws.com.cn/bucket/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: 'cn-north-1' });
	});

	it('parses a FIPS hostname, keeping the -fips service label verbatim (normalization is signing-side)', () => {
		const url = new URL('https://s3-fips.us-east-1.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 's3-fips', region: 'us-east-1' });
	});

	it('parses a combined FIPS + dual-stack hostname', () => {
		const url = new URL('https://s3-fips.dualstack.us-east-1.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 's3-fips', region: 'us-east-1' });
	});

	it('prefers the rightmost region-shaped label when a bucket label is itself named like a region', () => {
		const url = new URL('https://us-east-2.s3.us-east-1.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: 'us-east-1' });
	});

	it('parses a legacy region-first SQS hostname', () => {
		const url = new URL('https://us-east-2.queue.amazonaws.com/123456789012/my-queue');
		expect(parseAwsUrl(url)).toEqual({ service: 'queue', region: 'us-east-2' });
	});

	it('parses a region-middle OpenSearch domain hostname (service right of the region)', () => {
		const url = new URL('https://search-mydomain-abc123.us-east-1.es.amazonaws.com/_search');
		expect(parseAwsUrl(url)).toEqual({ service: 'es', region: 'us-east-1' });
	});

	it('resolves the service left of the region for a bucket-qualified S3 interface endpoint', () => {
		// Outside VPCE_HOSTNAME_PATTERN by design (extra bucket label before the vpce id);
		// the trailing `vpce` label must not be mistaken for a region-middle service.
		const url = new URL('https://mybucket.vpce-0abc123.s3.us-east-1.vpce.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: 'us-east-1' });
	});

	it('parses an S3 access-point hostname', () => {
		const url = new URL('https://myap-123456789012.s3-accesspoint.us-west-2.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 's3-accesspoint', region: 'us-west-2' });
	});

	it('parses an API Gateway execute-api hostname', () => {
		const url = new URL('https://myapi123.execute-api.us-west-2.amazonaws.com/prod/resource');
		expect(parseAwsUrl(url)).toEqual({ service: 'execute-api', region: 'us-west-2' });
	});

	it('parses a virtual-hosted S3 bucket hostname', () => {
		const url = new URL('https://bucket.s3.us-east-1.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: 'us-east-1' });
	});

	it('parses a legacy fips-prefixed hostname', () => {
		const url = new URL('https://fips.sqs.us-east-1.amazonaws.com/123456789012/my-queue');
		expect(parseAwsUrl(url)).toEqual({ service: 'sqs', region: 'us-east-1' });
	});

	it('resolves the service label even when the bucket is named exactly like the region', () => {
		const url = new URL('https://us-east-1.s3.us-east-1.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: 'us-east-1' });
	});

	it('skips the dualstack qualifier when resolving the service at depth', () => {
		const url = new URL('https://bucket.s3.dualstack.us-east-1.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: 'us-east-1' });
	});

	it('keeps dualstack as the service when it is the first label (no qualifier skip below index 0)', () => {
		const url = new URL('https://dualstack.us-east-1.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'dualstack', region: 'us-east-1' });
	});

	it('does not let a supported bucket label shadow an unsupported region label in the region slot', () => {
		const url = new URL('https://us-east-1.s3.eu-central-9.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: 'eu-central-9' });
	});

	it('surfaces a mistyped region label via the shape fallback', () => {
		const url = new URL('https://lambda.us-esat-1.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'lambda', region: 'us-esat-1' });
	});

	it('surfaces a mistyped GovCloud-shaped region label (multi-word shape)', () => {
		const url = new URL('https://lambda.us-gov-wast-1.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'lambda', region: 'us-gov-wast-1' });
	});

	it('surfaces a region-shaped label for a not-yet-supported region', () => {
		const url = new URL('https://lambda.eu-central-9.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'lambda', region: 'eu-central-9' });
	});

	it('surfaces a region-shaped label with a four-letter partition prefix', () => {
		const url = new URL('https://lambda.eusc-de-east-1.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'lambda', region: 'eusc-de-east-1' });
	});

	it('returns a null region when the label is not region-shaped (missing-hyphen typo)', () => {
		const url = new URL('https://lambda.us-east1.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'lambda', region: null });
	});

	it('returns a null region for an AWS host with no region-shaped label', () => {
		const url = new URL('https://foo.bar.amazonaws.com/');
		expect(parseAwsUrl(url)).toEqual({ service: 'foo', region: null });
	});

	it('does not shape-match the region-less legacy s3-external-1 host', () => {
		const url = new URL('https://s3-external-1.amazonaws.com/bucket/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3-external-1', region: null });
	});

	it('does not shape-match the region-less legacy SQS queue host', () => {
		const url = new URL('https://queue.amazonaws.com/123456789012/my-queue');
		expect(parseAwsUrl(url)).toEqual({ service: 'queue', region: null });
	});

	it('parses a legacy region-less virtual-hosted S3 hostname', () => {
		const url = new URL('https://mybucket.s3.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: null });
	});

	it('parses a legacy region-less S3 transfer-acceleration hostname', () => {
		const url = new URL('https://mybucket.s3-accelerate.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3-accelerate', region: null });
	});

	it('parses a legacy region-less S3 accelerate dual-stack hostname', () => {
		const url = new URL('https://mybucket.s3-accelerate.dualstack.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3-accelerate', region: null });
	});

	it('treats a region-shaped bucket label in front of s3 as a bucket, not the region', () => {
		const url = new URL('https://my-bucket-1.s3.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: null });
	});

	it('treats a bucket named exactly like a region on the legacy global S3 endpoint as a bucket', () => {
		const url = new URL('https://us-east-2.s3.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: null });
	});

	it('treats a region-shaped bucket label in front of s3-accelerate as a bucket', () => {
		const url = new URL('https://my-bucket-1.s3-accelerate.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3-accelerate', region: null });
	});

	it('parses a legacy dash-region virtual-hosted S3 hostname', () => {
		const url = new URL('https://mybucket.s3-us-west-2.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: 'us-west-2' });
	});

	it('parses a legacy dash-region path-style S3 hostname', () => {
		const url = new URL('https://s3-eu-west-1.amazonaws.com/bucket/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: 'eu-west-1' });
	});

	it('prefers the dash-region label over a region-shaped bucket label', () => {
		const url = new URL('https://my-logs-1.s3-us-west-2.amazonaws.com/key');
		expect(parseAwsUrl(url)).toEqual({ service: 's3', region: 'us-west-2' });
	});

	it('returns a null region for a custom host without region-shaped labels', () => {
		const url = new URL('https://myapi.example.com/x');
		expect(parseAwsUrl(url)).toEqual({ service: 'myapi', region: null });
	});
});

describe('AWS_REGION_SHAPE_PATTERN', () => {
	it('matches every supported region name', () => {
		// Invariant: the pattern must match every supported region, since the scan in
		// parseAwsUrl only considers region-shaped labels. If AWS ships a region with
		// a new prefix shape, widen the pattern alongside regions.ts.
		const nonMatching = regions
			.filter((r) => !AWS_REGION_SHAPE_PATTERN.test(r.name))
			.map((r) => r.name);
		expect(nonMatching).toEqual([]);
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

	describe('Dual-stack and FIPS endpoints', () => {
		it('signs a dual-stack S3 host with the host-derived region and the s3 service', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://s3.dualstack.us-west-2.amazonaws.com/bucket/key',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.region).toBe('us-west-2');
			expect(signOpts.service).toBe('s3');
		});

		it('signs a FIPS S3 host under the base s3 service name', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://s3-fips.us-east-1.amazonaws.com/bucket/key',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'eu-central-1',
			);

			expect(signOpts.service).toBe('s3');
			expect(signOpts.region).toBe('us-east-1');
		});

		it('strips the -fips suffix before the Bedrock signing-name mapping', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://bedrock-runtime-fips.us-east-1.amazonaws.com/model/x/invoke',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			// bedrock-runtime-fips → bedrock-runtime → bedrock; stripping after the
			// mapping instead would sign with the unknown name bedrock-runtime-fips.
			expect(signOpts.service).toBe('bedrock');
		});

		it('strips the -fips suffix for services without a signing-name mapping', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{ uri: 'https://lambda-fips.us-east-1.amazonaws.com/', headers: {} } as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('lambda');
		});
	});

	describe('endpoints with qualifier labels left of the service', () => {
		it('signs an API Gateway invoke URL with the execute-api service', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://myapi123.execute-api.us-west-2.amazonaws.com/prod/x',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('execute-api');
			expect(signOpts.region).toBe('us-west-2');
		});

		it('signs an S3 access-point host under the s3 service name', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://myap-123456789012.s3-accesspoint.us-west-2.amazonaws.com/object',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('s3');
			expect(signOpts.region).toBe('us-west-2');
		});

		it('signs an S3 Control host under the s3 service name', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://123456789012.s3-control.us-east-1.amazonaws.com/',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('s3');
		});

		it('signs a legacy region-less virtual-hosted S3 host as s3 with the credential region', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{ uri: 'https://mybucket.s3.amazonaws.com/key', headers: {} } as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('s3');
			expect(signOpts.region).toBe('us-east-1');
		});

		it('signs an S3 transfer-acceleration host under the s3 service name', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{ uri: 'https://mybucket.s3-accelerate.amazonaws.com/key', headers: {} } as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('s3');
		});

		it('signs a region-less legacy SQS global host as sqs with the credential region', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{ uri: 'https://queue.amazonaws.com/123456789012/my-queue', headers: {} } as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('sqs');
			expect(signOpts.region).toBe('us-east-1');
		});

		it('signs a region-middle OpenSearch domain host with the es service and its region', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://search-mydomain-abc123.us-west-2.es.amazonaws.com/_search',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('es');
			expect(signOpts.region).toBe('us-west-2');
		});

		it('signs an S3 Control FIPS host under the s3 service name (strip composes with the family)', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://123456789012.s3-control-fips.us-east-1.amazonaws.com/',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('s3');
		});

		it('signs a legacy region-first SQS host with the sqs service and its own region', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://us-east-2.queue.amazonaws.com/123456789012/my-queue',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('sqs');
			expect(signOpts.region).toBe('us-east-2');
		});

		it('signs a caller-supplied qualified S3 access-point service under the s3 service name', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{ headers: {} } as any,
				baseCredentials,
				'',
				'GET',
				'myap-123456789012.s3-accesspoint',
				'us-east-1',
			);

			expect(signOpts.service).toBe('s3');
		});
	});

	describe('region labels that cannot be adopted on AWS endpoint hosts', () => {
		it('signs a region-shaped bucket on the legacy global S3 endpoint with the credential region', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{ uri: 'https://test-logs-3.s3.amazonaws.com/key', headers: {} } as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('s3');
			expect(signOpts.region).toBe('us-east-1');
		});

		it('signs a legacy dash-region S3 host with the embedded region', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{ uri: 'https://mybucket.s3-us-west-2.amazonaws.com/key', headers: {} } as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.service).toBe('s3');
			expect(signOpts.region).toBe('us-west-2');
		});

		it('throws for a mistyped region embedded in a legacy dash-region S3 label', () => {
			const call = () =>
				awsGetSignInOptionsAndUpdateRequest(
					{ uri: 'https://s3-us-esat-1.amazonaws.com/bucket/key', headers: {} } as any,
					baseCredentials,
					'',
					'GET',
					'',
					'us-east-1',
				);

			expect(call).toThrow(UserError);
			expect(call).toThrow('us-esat-1');
		});

		it('throws for a mistyped region label', () => {
			const call = () =>
				awsGetSignInOptionsAndUpdateRequest(
					{ uri: 'https://lambda.us-esat-1.amazonaws.com/', headers: {} } as any,
					baseCredentials,
					'',
					'GET',
					'',
					'us-east-1',
				);

			expect(call).toThrow(UserError);
			expect(call).toThrow('us-esat-1');
		});

		it('throws for a region-shaped label the region list does not include yet', () => {
			const call = () =>
				awsGetSignInOptionsAndUpdateRequest(
					{ uri: 'https://lambda.eu-central-9.amazonaws.com/', headers: {} } as any,
					baseCredentials,
					'',
					'GET',
					'',
					'us-east-1',
				);

			expect(call).toThrow(UserError);
			expect(call).toThrow('eu-central-9');
		});

		it('throws for an unsupported region slot even when a bucket label is a supported region', () => {
			const call = () =>
				awsGetSignInOptionsAndUpdateRequest(
					{ uri: 'https://us-east-1.s3.eu-central-9.amazonaws.com/key', headers: {} } as any,
					baseCredentials,
					'',
					'GET',
					'',
					'us-east-1',
				);

			expect(call).toThrow(UserError);
			expect(call).toThrow('eu-central-9');
		});

		it('throws for a not-yet-supported region with a four-letter partition prefix', () => {
			const call = () =>
				awsGetSignInOptionsAndUpdateRequest(
					{ uri: 'https://lambda.eusc-de-east-1.amazonaws.com/', headers: {} } as any,
					baseCredentials,
					'',
					'GET',
					'',
					'us-east-1',
				);

			expect(call).toThrow(UserError);
			expect(call).toThrow('eusc-de-east-1');
		});

		it.each(['https://lambda.us-east1.amazonaws.com/', 'https://foo.bar.amazonaws.com/'])(
			'keeps the credential region without throwing when no label is region-shaped (%s)',
			(uri) => {
				const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
					{ uri, headers: {} } as any,
					baseCredentials,
					'',
					'GET',
					'',
					'us-east-1',
				);

				expect(signOpts.region).toBe('us-east-1');
			},
		);
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

		it('adopts a recognized region label from a deep custom-host label position', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://proxy.api.us-east-1.example.com/x',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'eu-central-1',
			);

			expect(signOpts.region).toBe('us-east-1');
			// The service rule applies to custom hosts too: the label left of the region.
			expect(signOpts.service).toBe('api');
		});

		it('keeps the credential region when a custom host label is region-shaped but unsupported', () => {
			const { signOpts } = awsGetSignInOptionsAndUpdateRequest(
				{
					uri: 'https://sqs.us-fake-1.mycompany.dev/queue',
					headers: {},
				} as any,
				baseCredentials,
				'',
				'GET',
				'',
				'us-east-1',
			);

			expect(signOpts.region).toBe('us-east-1');
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
