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
import { assumeRole } from './utils';
import * as systemCredentialsUtils from './system-credentials-utils';

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
