import { sign } from 'aws4';
import type { IHttpRequestOptions } from 'n8n-workflow';

import { AwsProfile } from '../AwsProfile.credentials';
import * as profileCredentialsUtils from '../common/aws/profile-credentials-utils';
import type { AwsProfileCredentialSource, AWSRegion } from '../common/aws/types';

jest.mock('aws4', () => ({
	sign: jest.fn(),
}));

jest.mock('../common/aws/profile-credentials-utils', () => ({
	resolveCredentials: jest.fn(),
}));

describe('AwsProfile Credential', () => {
	const awsProfile = new AwsProfile();
	let mockSign: jest.MockedFunction<typeof sign>;
	let mockResolveCredentials: jest.MockedFunction<
		typeof profileCredentialsUtils.resolveCredentials
	>;

	beforeEach(() => {
		mockSign = sign as jest.MockedFunction<typeof sign>;
		mockResolveCredentials = profileCredentialsUtils.resolveCredentials as jest.MockedFunction<
			typeof profileCredentialsUtils.resolveCredentials
		>;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('credential class properties', () => {
		it('should have correct name', () => {
			expect(awsProfile.name).toBe('awsProfile');
		});

		it('should have correct displayName', () => {
			expect(awsProfile.displayName).toBe('AWS (Profile/Instance)');
		});

		it('should have correct documentationUrl', () => {
			expect(awsProfile.documentationUrl).toBe('awsprofile');
		});

		it('should have correct icon configuration', () => {
			expect(awsProfile.icon).toEqual({
				light: 'file:icons/AWS.svg',
				dark: 'file:icons/AWS.dark.svg',
			});
		});

		it('should have properties defined', () => {
			expect(awsProfile.properties.length).toBeGreaterThan(0);
		});

		it('should have test configuration', () => {
			expect(awsProfile.test).toBeDefined();
			expect(awsProfile.test.request.baseURL).toBe(
				// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
				'={{$credentials.region.startsWith("cn-") ? `https://sts.${$credentials.region}.amazonaws.com.cn` : `https://sts.${$credentials.region}.amazonaws.com`}}',
			);
			expect(awsProfile.test.request.url).toBe('?Action=GetCallerIdentity&Version=2011-06-15');
			expect(awsProfile.test.request.method).toBe('POST');
		});

		it('should have credentialSource property with all expected options', () => {
			const credentialSourceProperty = awsProfile.properties.find(
				(prop) => prop.name === 'credentialSource',
			);
			expect(credentialSourceProperty).toBeDefined();
			expect(credentialSourceProperty?.type).toBe('options');

			const options = credentialSourceProperty?.options;
			expect(options).toBeDefined();
			if (Array.isArray(options)) {
				const optionValues = options.map((opt) => {
					if (typeof opt === 'object' && 'value' in opt) {
						return opt.value;
					}
					return opt;
				});
				expect(optionValues).toContain('profile');
				expect(optionValues).toContain('instanceMetadata');
				expect(optionValues).toContain('containerMetadata');
				expect(optionValues).toContain('tokenFile');
				expect(optionValues).toContain('chain');
			}
		});
	});

	describe('authenticate', () => {
		const baseCredentials = {
			region: 'eu-central-1' as AWSRegion,
			customEndpoints: false,
		};

		const baseRequestOptions: IHttpRequestOptions = {
			qs: {},
			body: {},
			headers: {},
			baseURL: 'https://sts.eu-central-1.amazonaws.com',
			url: '?Action=GetCallerIdentity&Version=2011-06-15',
			method: 'POST',
			returnFullResponse: true,
		};

		const mockResolvedCredentials = {
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
			sessionToken: 'mock-session-token',
		};

		describe('with profile source', () => {
			const profileCredentials = {
				...baseCredentials,
				credentialSource: 'profile' as AwsProfileCredentialSource,
				profileName: 'my-profile',
			};

			it('should call resolveCredentials with profile source', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);

				await awsProfile.authenticate(profileCredentials, baseRequestOptions);

				expect(mockResolveCredentials).toHaveBeenCalledWith({
					source: 'profile',
					profile: 'my-profile',
					region: 'eu-central-1',
					roleArn: undefined,
					roleSessionName: undefined,
				});
			});

			it('should sign request with resolved credentials', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);

				const result = await awsProfile.authenticate(profileCredentials, baseRequestOptions);

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						host: 'sts.eu-central-1.amazonaws.com',
						path: '/?Action=GetCallerIdentity&Version=2011-06-15',
						region: 'eu-central-1',
					}),
					{
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
						secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
						sessionToken: 'mock-session-token',
					},
				);
				expect(result.method).toBe('POST');
				expect(result.url).toBe(
					'https://sts.eu-central-1.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15',
				);
			});

			it('should use default profile when profileName is not provided', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);
				const credentialsWithoutProfile = {
					...baseCredentials,
					credentialSource: 'profile' as AwsProfileCredentialSource,
				};

				await awsProfile.authenticate(credentialsWithoutProfile, baseRequestOptions);

				expect(mockResolveCredentials).toHaveBeenCalledWith({
					source: 'profile',
					profile: undefined,
					region: 'eu-central-1',
					roleArn: undefined,
					roleSessionName: undefined,
				});
			});
		});

		describe('with instanceMetadata source', () => {
			const instanceMetadataCredentials = {
				...baseCredentials,
				credentialSource: 'instanceMetadata' as AwsProfileCredentialSource,
			};

			it('should call resolveCredentials with instanceMetadata source', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);

				await awsProfile.authenticate(instanceMetadataCredentials, baseRequestOptions);

				expect(mockResolveCredentials).toHaveBeenCalledWith({
					source: 'instanceMetadata',
					profile: undefined,
					region: 'eu-central-1',
					roleArn: undefined,
					roleSessionName: undefined,
				});
			});

			it('should sign request with resolved credentials from instance metadata', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);

				const result = await awsProfile.authenticate(
					instanceMetadataCredentials,
					baseRequestOptions,
				);

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						host: 'sts.eu-central-1.amazonaws.com',
					}),
					{
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
						secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
						sessionToken: 'mock-session-token',
					},
				);
				expect(result.method).toBe('POST');
			});
		});

		describe('with containerMetadata source', () => {
			const containerMetadataCredentials = {
				...baseCredentials,
				credentialSource: 'containerMetadata' as AwsProfileCredentialSource,
			};

			it('should call resolveCredentials with containerMetadata source', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);

				await awsProfile.authenticate(containerMetadataCredentials, baseRequestOptions);

				expect(mockResolveCredentials).toHaveBeenCalledWith({
					source: 'containerMetadata',
					profile: undefined,
					region: 'eu-central-1',
					roleArn: undefined,
					roleSessionName: undefined,
				});
			});

			it('should sign request with resolved credentials from container metadata', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);

				const result = await awsProfile.authenticate(
					containerMetadataCredentials,
					baseRequestOptions,
				);

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						host: 'sts.eu-central-1.amazonaws.com',
					}),
					{
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
						secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
						sessionToken: 'mock-session-token',
					},
				);
				expect(result.method).toBe('POST');
			});
		});

		describe('with tokenFile source', () => {
			const tokenFileCredentials = {
				...baseCredentials,
				credentialSource: 'tokenFile' as AwsProfileCredentialSource,
				roleArn: 'arn:aws:iam::123456789012:role/MyRole',
				roleSessionName: 'my-session',
			};

			it('should call resolveCredentials with tokenFile source and role parameters', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);

				await awsProfile.authenticate(tokenFileCredentials, baseRequestOptions);

				expect(mockResolveCredentials).toHaveBeenCalledWith({
					source: 'tokenFile',
					profile: undefined,
					region: 'eu-central-1',
					roleArn: 'arn:aws:iam::123456789012:role/MyRole',
					roleSessionName: 'my-session',
				});
			});

			it('should sign request with resolved credentials from token file', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);

				const result = await awsProfile.authenticate(tokenFileCredentials, baseRequestOptions);

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						host: 'sts.eu-central-1.amazonaws.com',
					}),
					{
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
						secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
						sessionToken: 'mock-session-token',
					},
				);
				expect(result.method).toBe('POST');
			});

			it('should handle empty roleArn by passing undefined', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);
				const credentialsWithEmptyRoleArn = {
					...baseCredentials,
					credentialSource: 'tokenFile' as AwsProfileCredentialSource,
					roleArn: '',
					roleSessionName: 'my-session',
				};

				await awsProfile.authenticate(credentialsWithEmptyRoleArn, baseRequestOptions);

				expect(mockResolveCredentials).toHaveBeenCalledWith({
					source: 'tokenFile',
					profile: undefined,
					region: 'eu-central-1',
					roleArn: undefined,
					roleSessionName: 'my-session',
				});
			});
		});

		describe('with chain source', () => {
			const chainCredentials = {
				...baseCredentials,
				credentialSource: 'chain' as AwsProfileCredentialSource,
				profileName: 'chain-profile',
			};

			it('should call resolveCredentials with chain source', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);

				await awsProfile.authenticate(chainCredentials, baseRequestOptions);

				expect(mockResolveCredentials).toHaveBeenCalledWith({
					source: 'chain',
					profile: 'chain-profile',
					region: 'eu-central-1',
					roleArn: undefined,
					roleSessionName: undefined,
				});
			});

			it('should sign request with resolved credentials from chain', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);

				const result = await awsProfile.authenticate(chainCredentials, baseRequestOptions);

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						host: 'sts.eu-central-1.amazonaws.com',
					}),
					{
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
						secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
						sessionToken: 'mock-session-token',
					},
				);
				expect(result.method).toBe('POST');
			});
		});

		describe('error handling', () => {
			it('should propagate errors from resolveCredentials', async () => {
				const credentialsError = new Error('Failed to resolve credentials');
				mockResolveCredentials.mockRejectedValue(credentialsError);

				const profileCredentials = {
					...baseCredentials,
					credentialSource: 'profile' as AwsProfileCredentialSource,
					profileName: 'invalid-profile',
				};

				await expect(
					awsProfile.authenticate(profileCredentials, baseRequestOptions),
				).rejects.toThrow('Failed to resolve credentials');
			});

			it('should handle credentials without session token', async () => {
				const credentialsWithoutToken = {
					accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
					sessionToken: undefined,
				};
				mockResolveCredentials.mockResolvedValue(credentialsWithoutToken);

				const profileCredentials = {
					...baseCredentials,
					credentialSource: 'profile' as AwsProfileCredentialSource,
					profileName: 'static-creds-profile',
				};

				await awsProfile.authenticate(profileCredentials, baseRequestOptions);

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						host: 'sts.eu-central-1.amazonaws.com',
					}),
					{
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
						secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
						sessionToken: undefined,
					},
				);
			});
		});

		describe('region handling', () => {
			it('should use region from credentials', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);
				const usWestCredentials = {
					...baseCredentials,
					region: 'us-west-2' as AWSRegion,
					credentialSource: 'profile' as AwsProfileCredentialSource,
					profileName: 'my-profile',
				};

				await awsProfile.authenticate(usWestCredentials, {
					...baseRequestOptions,
					baseURL: 'https://sts.us-west-2.amazonaws.com',
				});

				expect(mockResolveCredentials).toHaveBeenCalledWith(
					expect.objectContaining({
						region: 'us-west-2',
					}),
				);
			});

			it('should use _region from query string if provided', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);
				const profileCredentials = {
					...baseCredentials,
					credentialSource: 'profile' as AwsProfileCredentialSource,
					profileName: 'my-profile',
				};

				await awsProfile.authenticate(profileCredentials, {
					...baseRequestOptions,
					qs: { _region: 'ap-northeast-1' },
				});

				expect(mockResolveCredentials).toHaveBeenCalledWith(
					expect.objectContaining({
						region: 'ap-northeast-1',
					}),
				);
			});

			it('should handle China regions correctly', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);
				const chinaCredentials = {
					...baseCredentials,
					region: 'cn-north-1' as AWSRegion,
					credentialSource: 'profile' as AwsProfileCredentialSource,
					profileName: 'china-profile',
				};

				const result = await awsProfile.authenticate(chinaCredentials, {
					...baseRequestOptions,
					url: '',
					baseURL: '',
					qs: { service: 's3' },
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						host: 's3.cn-north-1.amazonaws.com.cn',
						region: 'cn-north-1',
					}),
					expect.objectContaining({
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					}),
				);
				expect(result.url).toBe('https://s3.cn-north-1.amazonaws.com.cn/');
			});
		});

		describe('custom endpoints', () => {
			it('should use custom endpoint when customEndpoints is true', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);
				const customEndpoint = 'https://custom.s3.endpoint.com';
				const customEndpointCredentials = {
					...baseCredentials,
					credentialSource: 'profile' as AwsProfileCredentialSource,
					profileName: 'my-profile',
					customEndpoints: true,
					s3Endpoint: customEndpoint,
				};

				const result = await awsProfile.authenticate(customEndpointCredentials, {
					...baseRequestOptions,
					url: '',
					baseURL: '',
					qs: { service: 's3' },
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						host: 'custom.s3.endpoint.com',
					}),
					expect.objectContaining({
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					}),
				);
				expect(result.url).toBe(`${customEndpoint}/`);
			});
		});

		describe('AWS4 signing', () => {
			it('should properly construct sign options', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);
				const profileCredentials = {
					...baseCredentials,
					credentialSource: 'profile' as AwsProfileCredentialSource,
					profileName: 'my-profile',
				};

				await awsProfile.authenticate(profileCredentials, baseRequestOptions);

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						method: 'POST',
						host: 'sts.eu-central-1.amazonaws.com',
						path: '/?Action=GetCallerIdentity&Version=2011-06-15',
						region: 'eu-central-1',
					}),
					{
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
						secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
						sessionToken: 'mock-session-token',
					},
				);
			});

			it('should handle service-specific requests', async () => {
				mockResolveCredentials.mockResolvedValue(mockResolvedCredentials);
				const profileCredentials = {
					...baseCredentials,
					credentialSource: 'profile' as AwsProfileCredentialSource,
					profileName: 'my-profile',
				};

				const result = await awsProfile.authenticate(profileCredentials, {
					...baseRequestOptions,
					url: '',
					baseURL: '',
					qs: { service: 'lambda', path: '/functions' },
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						host: 'lambda.eu-central-1.amazonaws.com',
					}),
					expect.objectContaining({
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					}),
				);
				expect(result.url).toContain('lambda.eu-central-1.amazonaws.com');
			});
		});
	});
});
