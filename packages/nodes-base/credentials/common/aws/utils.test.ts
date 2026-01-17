import { ApplicationError } from 'n8n-workflow';
import type { AwsAssumeRoleCredentialsType, AWSRegion } from './types';

global.fetch = jest.fn();

jest.mock('aws4', () => ({
	sign: jest.fn(),
}));

jest.mock('xml2js', () => ({
	parseString: jest.fn(),
}));

import { sign } from 'aws4';
import { parseString } from 'xml2js';
import { assumeRole, normalizeServiceName, parseAwsUrl } from './utils';
import * as systemCredentialsUtils from './system-credentials-utils';

describe('normalizeServiceName', () => {
	describe('explicit mappings', () => {
		it('should normalize bedrock-runtime to bedrock', () => {
			expect(normalizeServiceName('bedrock-runtime')).toBe('bedrock');
		});

		it('should normalize bedrock-agent-runtime to bedrock', () => {
			expect(normalizeServiceName('bedrock-agent-runtime')).toBe('bedrock');
		});

		it('should normalize bedrock-data-automation-runtime to bedrock', () => {
			expect(normalizeServiceName('bedrock-data-automation-runtime')).toBe('bedrock');
		});

		it('should normalize iot-data to iotdevicegateway', () => {
			expect(normalizeServiceName('iot-data')).toBe('iotdevicegateway');
		});
	});

	describe('pattern matching fallback', () => {
		it('should normalize bedrock-*-runtime services to bedrock via pattern matching', () => {
			// Test with a hypothetical future bedrock runtime service not in the explicit mapping
			expect(normalizeServiceName('bedrock-custom-runtime')).toBe('bedrock');
			expect(normalizeServiceName('bedrock-newfeature-runtime')).toBe('bedrock');
		});

		it('should not normalize bedrock services without runtime suffix', () => {
			// These should return as-is since they don't match the pattern
			expect(normalizeServiceName('bedrock')).toBe('bedrock');
			expect(normalizeServiceName('bedrock-agent')).toBe('bedrock-agent');
		});
	});

	describe('services without mappings', () => {
		it('should return s3 unchanged', () => {
			expect(normalizeServiceName('s3')).toBe('s3');
		});

		it('should return lambda unchanged', () => {
			expect(normalizeServiceName('lambda')).toBe('lambda');
		});

		it('should return dynamodb unchanged', () => {
			expect(normalizeServiceName('dynamodb')).toBe('dynamodb');
		});

		it('should return ec2 unchanged', () => {
			expect(normalizeServiceName('ec2')).toBe('ec2');
		});

		it('should return sts unchanged', () => {
			expect(normalizeServiceName('sts')).toBe('sts');
		});

		it('should return sns unchanged', () => {
			expect(normalizeServiceName('sns')).toBe('sns');
		});

		it('should return sqs unchanged', () => {
			expect(normalizeServiceName('sqs')).toBe('sqs');
		});
	});
});

describe('parseAwsUrl', () => {
	describe('standard AWS services', () => {
		it('should parse standard service URL with region', () => {
			const url = new URL('https://s3.us-east-1.amazonaws.com/bucket/key');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 's3',
				region: 'us-east-1',
			});
		});

		it('should parse Lambda endpoint', () => {
			const url = new URL('https://lambda.eu-west-1.amazonaws.com');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 'lambda',
				region: 'eu-west-1',
			});
		});

		it('should parse DynamoDB endpoint', () => {
			const url = new URL('https://dynamodb.ap-southeast-1.amazonaws.com');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 'dynamodb',
				region: 'ap-southeast-1',
			});
		});
	});

	describe('Bedrock services with normalization', () => {
		it('should normalize bedrock-runtime to bedrock and extract region', () => {
			const url = new URL('https://bedrock-runtime.us-east-1.amazonaws.com');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 'bedrock',
				region: 'us-east-1',
			});
		});

		it('should normalize bedrock-agent-runtime to bedrock', () => {
			const url = new URL('https://bedrock-agent-runtime.us-west-2.amazonaws.com');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 'bedrock',
				region: 'us-west-2',
			});
		});

		it('should normalize bedrock-data-automation-runtime to bedrock', () => {
			const url = new URL('https://bedrock-data-automation-runtime.eu-central-1.amazonaws.com');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 'bedrock',
				region: 'eu-central-1',
			});
		});

		it('should handle hypothetical future bedrock runtime services', () => {
			const url = new URL('https://bedrock-custom-runtime.ap-northeast-1.amazonaws.com');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 'bedrock',
				region: 'ap-northeast-1',
			});
		});
	});

	describe('IoT services with normalization', () => {
		it('should normalize iot-data to iotdevicegateway', () => {
			const url = new URL('https://iot-data.us-east-1.amazonaws.com');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 'iotdevicegateway',
				region: 'us-east-1',
			});
		});
	});

	describe('China region endpoints', () => {
		it('should parse China region endpoint with .cn domain', () => {
			const url = new URL('https://s3.cn-north-1.amazonaws.com.cn');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 's3',
				region: 'cn-north-1',
			});
		});

		it('should parse bedrock-runtime in China region', () => {
			const url = new URL('https://bedrock-runtime.cn-northwest-1.amazonaws.com.cn');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 'bedrock',
				region: 'cn-northwest-1',
			});
		});
	});

	describe('global services without region', () => {
		it('should parse IAM endpoint (global service)', () => {
			const url = new URL('https://iam.amazonaws.com');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 'iam',
				region: undefined,
			});
		});

		it('should parse CloudFront endpoint (global service)', () => {
			const url = new URL('https://cloudfront.amazonaws.com');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 'cloudfront',
				region: undefined,
			});
		});
	});

	describe('edge cases', () => {
		it('should handle URLs with paths', () => {
			const url = new URL('https://bedrock-runtime.us-east-1.amazonaws.com/model/invoke');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 'bedrock',
				region: 'us-east-1',
			});
		});

		it('should handle URLs with query parameters', () => {
			const url = new URL('https://s3.us-west-2.amazonaws.com/bucket?prefix=test');
			const result = parseAwsUrl(url);
			expect(result).toEqual({
				service: 's3',
				region: 'us-west-2',
			});
		});

		it('should handle various AWS regions', () => {
			const regions = [
				'us-east-1',
				'us-west-2',
				'eu-west-1',
				'ap-southeast-1',
				'sa-east-1',
				'ca-central-1',
			];

			for (const region of regions) {
				const url = new URL(`https://lambda.${region}.amazonaws.com`);
				const result = parseAwsUrl(url);
				expect(result).toEqual({
					service: 'lambda',
					region,
				});
			}
		});
	});
});

describe('assumeRole', () => {
	let mockFetch: jest.MockedFunction<typeof fetch>;
	let mockSign: jest.MockedFunction<typeof sign>;
	let mockParseString: jest.MockedFunction<typeof parseString>;
	let consoleErrorSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
		mockSign = sign as jest.MockedFunction<typeof sign>;
		mockParseString = parseString as jest.MockedFunction<typeof parseString>;
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		mockSign.mockImplementation((request: any) => request as any);
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	describe('with system credentials', () => {
		it('should successfully assume role using system credentials', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: true,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				roleSessionName: 'test-session',
			};

			const mockSystemCredentials = {
				accessKeyId: 'system-access-key',
				secretAccessKey: 'system-secret-key',
				sessionToken: 'system-session-token',
				source: 'environment' as const,
			};

			jest
				.spyOn(systemCredentialsUtils, 'getSystemCredentials')
				.mockResolvedValue(mockSystemCredentials);

			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue(`<?xml version="1.0" encoding="UTF-8"?>
					<AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
						<AssumeRoleResult>
							<Credentials>
								<AccessKeyId>assumed-access-key</AccessKeyId>
								<SecretAccessKey>assumed-secret-key</SecretAccessKey>
								<SessionToken>assumed-session-token</SessionToken>
							</Credentials>
						</AssumeRoleResult>
					</AssumeRoleResponse>`),
			};

			mockFetch.mockResolvedValue(mockResponse as any);

			mockParseString.mockImplementation((_xml, _options, callback) => {
				callback(null, {
					AssumeRoleResponse: {
						AssumeRoleResult: {
							Credentials: {
								AccessKeyId: 'assumed-access-key',
								SecretAccessKey: 'assumed-secret-key',
								SessionToken: 'assumed-session-token',
							},
						},
					},
				});
			});

			const result = await assumeRole(credentials, 'us-east-1');

			expect(result).toEqual({
				accessKeyId: 'assumed-access-key',
				secretAccessKey: 'assumed-secret-key',
				sessionToken: 'assumed-session-token',
			});

			expect(systemCredentialsUtils.getSystemCredentials).toHaveBeenCalled();
			expect(mockSign).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					path: '/',
					region: 'us-east-1',
				}),
				mockSystemCredentials,
			);
			expect(mockFetch).toHaveBeenCalledWith(
				'https://sts.us-east-1.amazonaws.com',
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('Action=AssumeRole'),
				}),
			);
		});

		it('should throw error when system credentials are not available', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: true,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
			};

			jest.spyOn(systemCredentialsUtils, 'getSystemCredentials').mockResolvedValue(null);

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(ApplicationError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'System AWS credentials are required for role assumption',
			);
		});

		it('should include external ID when provided', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: true,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				roleSessionName: 'test-session',
				externalId: 'external-123',
			};

			const mockSystemCredentials = {
				accessKeyId: 'system-access-key',
				secretAccessKey: 'system-secret-key',
				source: 'environment' as const,
			};

			jest
				.spyOn(systemCredentialsUtils, 'getSystemCredentials')
				.mockResolvedValue(mockSystemCredentials);

			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('<?xml version="1.0" encoding="UTF-8"?>'),
			};

			mockFetch.mockResolvedValue(mockResponse as any);

			mockParseString.mockImplementation((_xml, _options, callback) => {
				callback(null, {
					AssumeRoleResponse: {
						AssumeRoleResult: {
							Credentials: {
								AccessKeyId: 'assumed-access-key',
								SecretAccessKey: 'assumed-secret-key',
								SessionToken: 'assumed-session-token',
							},
						},
					},
				});
			});

			await assumeRole(credentials, 'us-east-1');

			expect(mockFetch).toHaveBeenCalledWith(
				'https://sts.us-east-1.amazonaws.com',
				expect.objectContaining({
					body: expect.stringContaining('ExternalId=external-123'),
				}),
			);
		});
	});

	describe('with manual STS credentials', () => {
		it('should successfully assume role using manual STS credentials', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				roleSessionName: 'test-session',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
				stsSessionToken: 'sts-session-token',
			};

			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('<?xml version="1.0" encoding="UTF-8"?>'),
			};

			mockFetch.mockResolvedValue(mockResponse as any);

			mockParseString.mockImplementation((_xml, _options, callback) => {
				callback(null, {
					AssumeRoleResponse: {
						AssumeRoleResult: {
							Credentials: {
								AccessKeyId: 'assumed-access-key',
								SecretAccessKey: 'assumed-secret-key',
								SessionToken: 'assumed-session-token',
							},
						},
					},
				});
			});

			const result = await assumeRole(credentials, 'us-east-1');

			expect(result).toEqual({
				accessKeyId: 'assumed-access-key',
				secretAccessKey: 'assumed-secret-key',
				sessionToken: 'assumed-session-token',
			});

			expect(mockSign).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					path: '/',
					region: 'us-east-1',
				}),
				{
					accessKeyId: 'sts-access-key',
					secretAccessKey: 'sts-secret-key',
					sessionToken: 'sts-session-token',
				},
			);
		});

		it('should work without STS session token', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('<?xml version="1.0" encoding="UTF-8"?>'),
			};

			mockFetch.mockResolvedValue(mockResponse as any);

			mockParseString.mockImplementation((_xml, _options, callback) => {
				callback(null, {
					AssumeRoleResponse: {
						AssumeRoleResult: {
							Credentials: {
								AccessKeyId: 'assumed-access-key',
								SecretAccessKey: 'assumed-secret-key',
								SessionToken: 'assumed-session-token',
							},
						},
					},
				});
			});

			await assumeRole(credentials, 'us-east-1');

			expect(mockSign).toHaveBeenCalledWith(expect.anything(), {
				accessKeyId: 'sts-access-key',
				secretAccessKey: 'sts-secret-key',
				sessionToken: undefined,
			});
		});

		it('should throw error when STS access key ID is missing', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsSecretAccessKey: 'sts-secret-key',
			};

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(ApplicationError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'STS Access Key ID is required when not using system credentials',
			);
		});

		it('should throw error when STS access key ID is empty', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: '   ',
				stsSecretAccessKey: 'sts-secret-key',
			};

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(ApplicationError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'STS Access Key ID is required when not using system credentials',
			);
		});

		it('should throw error when STS secret access key is missing', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: 'sts-access-key',
			};

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(ApplicationError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'STS Secret Access Key is required when not using system credentials',
			);
		});

		it('should throw error when STS secret access key is empty', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: '   ',
			};

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(ApplicationError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'STS Secret Access Key is required when not using system credentials',
			);
		});

		it('should trim whitespace from STS credentials', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: '  sts-access-key  ',
				stsSecretAccessKey: '  sts-secret-key  ',
				stsSessionToken: '  sts-session-token  ',
			};

			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('<?xml version="1.0" encoding="UTF-8"?>'),
			};

			mockFetch.mockResolvedValue(mockResponse as any);

			mockParseString.mockImplementation((_xml, _options, callback) => {
				callback(null, {
					AssumeRoleResponse: {
						AssumeRoleResult: {
							Credentials: {
								AccessKeyId: 'assumed-access-key',
								SecretAccessKey: 'assumed-secret-key',
								SessionToken: 'assumed-session-token',
							},
						},
					},
				});
			});

			await assumeRole(credentials, 'us-east-1');

			expect(mockSign).toHaveBeenCalledWith(expect.anything(), {
				accessKeyId: 'sts-access-key',
				secretAccessKey: 'sts-secret-key',
				sessionToken: 'sts-session-token',
			});
		});
	});

	describe('region handling', () => {
		it('should use correct endpoint for China regions', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'cn-north-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws-cn:iam::123456789012:role/TestRole',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('<?xml version="1.0" encoding="UTF-8"?>'),
			};

			mockFetch.mockResolvedValue(mockResponse as any);

			mockParseString.mockImplementation((_xml, _options, callback) => {
				callback(null, {
					AssumeRoleResponse: {
						AssumeRoleResult: {
							Credentials: {
								AccessKeyId: 'assumed-access-key',
								SecretAccessKey: 'assumed-secret-key',
								SessionToken: 'assumed-session-token',
							},
						},
					},
				});
			});

			await assumeRole(credentials, 'cn-north-1' as AWSRegion);

			expect(mockFetch).toHaveBeenCalledWith(
				'https://sts.cn-north-1.amazonaws.com.cn',
				expect.any(Object),
			);
		});

		it('should use correct endpoint for standard regions', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'eu-west-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('<?xml version="1.0" encoding="UTF-8"?>'),
			};

			mockFetch.mockResolvedValue(mockResponse as any);

			mockParseString.mockImplementation((_xml, _options, callback) => {
				callback(null, {
					AssumeRoleResponse: {
						AssumeRoleResult: {
							Credentials: {
								AccessKeyId: 'assumed-access-key',
								SecretAccessKey: 'assumed-secret-key',
								SessionToken: 'assumed-session-token',
							},
						},
					},
				});
			});

			await assumeRole(credentials, 'eu-west-1');

			expect(mockFetch).toHaveBeenCalledWith(
				'https://sts.eu-west-1.amazonaws.com',
				expect.any(Object),
			);
		});
	});

	describe('error handling', () => {
		it('should throw error when signing fails', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			mockSign.mockImplementation(() => {
				throw new Error('Signing failed');
			});

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(ApplicationError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'Failed to sign STS request',
			);
		});

		it('should throw error when STS request fails', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			const mockResponse = {
				ok: false,
				status: 403,
				statusText: 'Forbidden',
				text: jest.fn().mockResolvedValue('Access denied'),
			};

			mockFetch.mockResolvedValue(mockResponse as any);

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(ApplicationError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'STS AssumeRole failed: 403 Forbidden - Access denied',
			);
		});

		it('should throw error when XML parsing fails', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('invalid xml'),
			};

			mockFetch.mockResolvedValue(mockResponse as any);

			mockParseString.mockImplementation((_xml, _options, callback) => {
				callback(new Error('XML parsing failed'), null);
			});

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow('XML parsing failed');
		});

		it('should throw error when response has no credentials', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('<?xml version="1.0" encoding="UTF-8"?>'),
			};

			mockFetch.mockResolvedValue(mockResponse as any);

			mockParseString.mockImplementation((_xml, _options, callback) => {
				callback(null, {
					AssumeRoleResponse: {
						AssumeRoleResult: {},
					},
				});
			});

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(ApplicationError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'Invalid response from STS AssumeRole',
			);
		});

		it('should throw error when response structure is invalid', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('<?xml version="1.0" encoding="UTF-8"?>'),
			};

			mockFetch.mockResolvedValue(mockResponse as any);

			mockParseString.mockImplementation((_xml, _options, callback) => {
				callback(null, {
					InvalidResponse: {},
				});
			});

			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(ApplicationError);
			await expect(assumeRole(credentials, 'us-east-1')).rejects.toThrow(
				'Invalid response from STS AssumeRole',
			);
		});
	});

	describe('default values', () => {
		it('should use default role session name when not provided', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				useSystemCredentialsForRole: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('<?xml version="1.0" encoding="UTF-8"?>'),
			};

			mockFetch.mockResolvedValue(mockResponse as any);

			mockParseString.mockImplementation((_xml, _options, callback) => {
				callback(null, {
					AssumeRoleResponse: {
						AssumeRoleResult: {
							Credentials: {
								AccessKeyId: 'assumed-access-key',
								SecretAccessKey: 'assumed-secret-key',
								SessionToken: 'assumed-session-token',
							},
						},
					},
				});
			});

			await assumeRole(credentials, 'us-east-1');

			expect(mockFetch).toHaveBeenCalledWith(
				'https://sts.us-east-1.amazonaws.com',
				expect.objectContaining({
					body: expect.stringContaining('RoleSessionName=n8n-session'),
				}),
			);
		});

		it('should default useSystemCredentialsForRole to false when not provided', async () => {
			const credentials: AwsAssumeRoleCredentialsType = {
				region: 'us-east-1',
				customEndpoints: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
			};

			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('<?xml version="1.0" encoding="UTF-8"?>'),
			};

			mockFetch.mockResolvedValue(mockResponse as any);

			mockParseString.mockImplementation((_xml, _options, callback) => {
				callback(null, {
					AssumeRoleResponse: {
						AssumeRoleResult: {
							Credentials: {
								AccessKeyId: 'assumed-access-key',
								SecretAccessKey: 'assumed-secret-key',
								SessionToken: 'assumed-session-token',
							},
						},
					},
				});
			});

			await assumeRole(credentials, 'us-east-1');

			expect(mockSign).toHaveBeenCalledWith(expect.anything(), {
				accessKeyId: 'sts-access-key',
				secretAccessKey: 'sts-secret-key',
				sessionToken: undefined,
			});
		});
	});
});
