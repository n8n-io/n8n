import { Container } from '@n8n/di';
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types';
import {
	resolveCredentials,
	createCredentialProvider,
	isAwsSystemCredentialsEnabled,
	type ProfileCredentialsOptions,
} from './profile-credentials-utils';

// Mock the @n8n/di Container
jest.mock('@n8n/di', () => ({
	Container: {
		get: jest.fn(),
	},
}));

// Mock the @aws-sdk/credential-providers module
jest.mock('@aws-sdk/credential-providers', () => ({
	fromIni: jest.fn(),
	fromInstanceMetadata: jest.fn(),
	fromContainerMetadata: jest.fn(),
	fromTokenFile: jest.fn(),
	fromNodeProviderChain: jest.fn(),
}));

// Import mocked modules
import {
	fromIni,
	fromInstanceMetadata,
	fromContainerMetadata,
	fromTokenFile,
	fromNodeProviderChain,
} from '@aws-sdk/credential-providers';

const mockedFromIni = fromIni as jest.MockedFunction<typeof fromIni>;
const mockedFromInstanceMetadata = fromInstanceMetadata as jest.MockedFunction<
	typeof fromInstanceMetadata
>;
const mockedFromContainerMetadata = fromContainerMetadata as jest.MockedFunction<
	typeof fromContainerMetadata
>;
const mockedFromTokenFile = fromTokenFile as jest.MockedFunction<typeof fromTokenFile>;
const mockedFromNodeProviderChain = fromNodeProviderChain as jest.MockedFunction<
	typeof fromNodeProviderChain
>;

describe('profile-credentials-utils', () => {
	const mockCredentials: AwsCredentialIdentity = {
		accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
		secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		sessionToken: 'AQoDYXdzEJr...',
	};

	const mockCredentialProvider: AwsCredentialIdentityProvider = jest
		.fn()
		.mockResolvedValue(mockCredentials);

	beforeEach(() => {
		jest.clearAllMocks();

		// Default: security gate is enabled
		(Container.get as jest.Mock).mockReturnValue({
			awsSystemCredentialsAccess: true,
		});

		// Setup default mock implementations
		mockedFromIni.mockReturnValue(mockCredentialProvider);
		mockedFromInstanceMetadata.mockReturnValue(mockCredentialProvider);
		mockedFromContainerMetadata.mockReturnValue(mockCredentialProvider);
		mockedFromTokenFile.mockReturnValue(mockCredentialProvider);
		mockedFromNodeProviderChain.mockReturnValue(mockCredentialProvider);
	});

	describe('isAwsSystemCredentialsEnabled', () => {
		it('should return true when security gate is enabled', () => {
			(Container.get as jest.Mock).mockReturnValue({
				awsSystemCredentialsAccess: true,
			});

			expect(isAwsSystemCredentialsEnabled()).toBe(true);
		});

		it('should return false when security gate is disabled', () => {
			(Container.get as jest.Mock).mockReturnValue({
				awsSystemCredentialsAccess: false,
			});

			expect(isAwsSystemCredentialsEnabled()).toBe(false);
		});

		it('should return false when SecurityConfig is not available', () => {
			(Container.get as jest.Mock).mockImplementation(() => {
				throw new Error('Container not initialized');
			});

			expect(isAwsSystemCredentialsEnabled()).toBe(false);
		});
	});

	describe('createCredentialProvider', () => {
		describe('security gate enforcement', () => {
			it('should return a provider that throws when security gate is disabled', async () => {
				(Container.get as jest.Mock).mockReturnValue({
					awsSystemCredentialsAccess: false,
				});

				const provider = createCredentialProvider({
					source: 'profile',
					region: 'us-east-1',
				});

				await expect(provider()).rejects.toThrow('Access to AWS system credentials disabled');
			});

			it('should not throw when security gate is enabled', () => {
				(Container.get as jest.Mock).mockReturnValue({
					awsSystemCredentialsAccess: true,
				});

				expect(() =>
					createCredentialProvider({
						source: 'profile',
						region: 'us-east-1',
					}),
				).not.toThrow();
			});
		});

		describe('profile source', () => {
			it('should use fromIni with default profile when no profile specified', () => {
				createCredentialProvider({
					source: 'profile',
					region: 'us-east-1',
				});

				expect(mockedFromIni).toHaveBeenCalledWith({
					profile: 'default',
					clientConfig: { region: 'us-east-1' },
				});
			});

			it('should use fromIni with specified profile name', () => {
				createCredentialProvider({
					source: 'profile',
					region: 'us-east-1',
					profile: 'production',
				});

				expect(mockedFromIni).toHaveBeenCalledWith({
					profile: 'production',
					clientConfig: { region: 'us-east-1' },
				});
			});

			it('should not mutate process.env', () => {
				const originalEnv = { ...process.env };

				createCredentialProvider({
					source: 'profile',
					region: 'us-east-1',
					profile: 'test-profile',
				});

				// Verify process.env was not modified
				expect(process.env.AWS_PROFILE).toBe(originalEnv.AWS_PROFILE);
				expect(process.env.AWS_REGION).toBe(originalEnv.AWS_REGION);
			});
		});

		describe('instanceMetadata source', () => {
			it('should use fromInstanceMetadata', () => {
				createCredentialProvider({
					source: 'instanceMetadata',
					region: 'us-west-2',
				});

				expect(mockedFromInstanceMetadata).toHaveBeenCalledWith({
					maxRetries: 3,
					timeout: 2000,
				});
			});
		});

		describe('containerMetadata source', () => {
			it('should use fromContainerMetadata', () => {
				createCredentialProvider({
					source: 'containerMetadata',
					region: 'eu-west-1',
				});

				expect(mockedFromContainerMetadata).toHaveBeenCalledWith({
					maxRetries: 3,
					timeout: 2000,
				});
			});
		});

		describe('tokenFile source', () => {
			it('should use fromTokenFile', () => {
				createCredentialProvider({
					source: 'tokenFile',
					region: 'ap-southeast-1',
				});

				expect(mockedFromTokenFile).toHaveBeenCalledWith({
					roleArn: undefined,
					roleSessionName: 'n8n-session',
					clientConfig: { region: 'ap-southeast-1' },
				});
			});

			it('should use fromTokenFile with roleArn', () => {
				createCredentialProvider({
					source: 'tokenFile',
					region: 'ap-southeast-1',
					roleArn: 'arn:aws:iam::123456789012:role/MyRole',
					roleSessionName: 'custom-session',
				});

				expect(mockedFromTokenFile).toHaveBeenCalledWith({
					roleArn: 'arn:aws:iam::123456789012:role/MyRole',
					roleSessionName: 'custom-session',
					clientConfig: { region: 'ap-southeast-1' },
				});
			});
		});

		describe('chain source', () => {
			it('should use fromNodeProviderChain with profile when specified', () => {
				createCredentialProvider({
					source: 'chain',
					region: 'us-east-1',
					profile: 'my-profile',
				});

				expect(mockedFromNodeProviderChain).toHaveBeenCalledWith({
					profile: 'my-profile',
					clientConfig: { region: 'us-east-1' },
				});
			});

			it('should use fromNodeProviderChain with default profile when not specified', () => {
				createCredentialProvider({
					source: 'chain',
					region: 'us-east-1',
				});

				expect(mockedFromNodeProviderChain).toHaveBeenCalledWith({
					profile: 'default',
					clientConfig: { region: 'us-east-1' },
				});
			});
		});

		describe('invalid source', () => {
			it('should return a provider that throws for unknown source', async () => {
				const provider = createCredentialProvider({
					source: 'unknown' as ProfileCredentialsOptions['source'],
					region: 'us-east-1',
				});

				await expect(provider()).rejects.toThrow('Unknown credential source: unknown');
			});
		});
	});

	describe('resolveCredentials', () => {
		describe('security gate enforcement', () => {
			it('should throw error when security gate is disabled', async () => {
				(Container.get as jest.Mock).mockReturnValue({
					awsSystemCredentialsAccess: false,
				});

				await expect(
					resolveCredentials({
						source: 'profile',
						region: 'us-east-1',
					}),
				).rejects.toThrow('Access to AWS system credentials disabled');
			});
		});

		describe('credential resolution', () => {
			it('should resolve credentials from profile', async () => {
				const result = await resolveCredentials({
					source: 'profile',
					region: 'us-east-1',
					profile: 'test',
				});

				expect(result).toEqual({
					accessKeyId: mockCredentials.accessKeyId,
					secretAccessKey: mockCredentials.secretAccessKey,
					sessionToken: mockCredentials.sessionToken,
				});
				expect(mockedFromIni).toHaveBeenCalledWith({
					profile: 'test',
					clientConfig: { region: 'us-east-1' },
				});
			});

			it('should resolve credentials from instance metadata', async () => {
				const result = await resolveCredentials({
					source: 'instanceMetadata',
					region: 'us-west-2',
				});

				expect(result).toEqual({
					accessKeyId: mockCredentials.accessKeyId,
					secretAccessKey: mockCredentials.secretAccessKey,
					sessionToken: mockCredentials.sessionToken,
				});
				expect(mockedFromInstanceMetadata).toHaveBeenCalled();
			});

			it('should resolve credentials from container metadata', async () => {
				const result = await resolveCredentials({
					source: 'containerMetadata',
					region: 'eu-west-1',
				});

				expect(result).toEqual({
					accessKeyId: mockCredentials.accessKeyId,
					secretAccessKey: mockCredentials.secretAccessKey,
					sessionToken: mockCredentials.sessionToken,
				});
				expect(mockedFromContainerMetadata).toHaveBeenCalled();
			});

			it('should resolve credentials from token file', async () => {
				const result = await resolveCredentials({
					source: 'tokenFile',
					region: 'ap-southeast-1',
				});

				expect(result).toEqual({
					accessKeyId: mockCredentials.accessKeyId,
					secretAccessKey: mockCredentials.secretAccessKey,
					sessionToken: mockCredentials.sessionToken,
				});
				expect(mockedFromTokenFile).toHaveBeenCalled();
			});

			it('should resolve credentials from chain', async () => {
				const result = await resolveCredentials({
					source: 'chain',
					region: 'us-east-1',
				});

				expect(result).toEqual({
					accessKeyId: mockCredentials.accessKeyId,
					secretAccessKey: mockCredentials.secretAccessKey,
					sessionToken: mockCredentials.sessionToken,
				});
				expect(mockedFromNodeProviderChain).toHaveBeenCalled();
			});
		});

		describe('error handling', () => {
			it('should provide helpful error for profile not found', async () => {
				const errorProvider: AwsCredentialIdentityProvider = jest
					.fn()
					.mockRejectedValue(new Error('Profile nonexistent not found'));
				mockedFromIni.mockReturnValue(errorProvider);

				await expect(
					resolveCredentials({
						source: 'profile',
						region: 'us-east-1',
						profile: 'nonexistent',
					}),
				).rejects.toThrow("AWS profile 'nonexistent' not found");
			});

			it('should provide helpful error for instance metadata timeout', async () => {
				const timeoutProvider: AwsCredentialIdentityProvider = jest
					.fn()
					.mockRejectedValue(new Error('timeout'));
				mockedFromInstanceMetadata.mockReturnValue(timeoutProvider);

				await expect(
					resolveCredentials({
						source: 'instanceMetadata',
						region: 'us-east-1',
					}),
				).rejects.toThrow('EC2 instance metadata service not available');
			});
		});

		describe('race condition prevention', () => {
			it('should handle concurrent credential resolutions without race conditions', async () => {
				// Create multiple credential providers that resolve at different times
				const createDelayedProvider = (
					delay: number,
					creds: AwsCredentialIdentity,
				): AwsCredentialIdentityProvider => {
					return jest.fn().mockImplementation(
						async () =>
							await new Promise((resolve) => {
								setTimeout(() => resolve(creds), delay);
							}),
					);
				};

				const creds1: AwsCredentialIdentity = {
					accessKeyId: 'KEY1',
					secretAccessKey: 'SECRET1',
				};
				const creds2: AwsCredentialIdentity = {
					accessKeyId: 'KEY2',
					secretAccessKey: 'SECRET2',
				};
				const creds3: AwsCredentialIdentity = {
					accessKeyId: 'KEY3',
					secretAccessKey: 'SECRET3',
				};

				mockedFromIni
					.mockReturnValueOnce(createDelayedProvider(50, creds1))
					.mockReturnValueOnce(createDelayedProvider(10, creds2))
					.mockReturnValueOnce(createDelayedProvider(30, creds3));

				// Execute concurrent requests
				const [result1, result2, result3] = await Promise.all([
					resolveCredentials({ source: 'profile', region: 'us-east-1', profile: 'profile1' }),
					resolveCredentials({ source: 'profile', region: 'us-east-1', profile: 'profile2' }),
					resolveCredentials({ source: 'profile', region: 'us-east-1', profile: 'profile3' }),
				]);

				// Each request should get its own credentials
				expect(result1.accessKeyId).toBe('KEY1');
				expect(result2.accessKeyId).toBe('KEY2');
				expect(result3.accessKeyId).toBe('KEY3');

				// Verify each profile was called with correct name
				expect(mockedFromIni).toHaveBeenNthCalledWith(1, {
					profile: 'profile1',
					clientConfig: { region: 'us-east-1' },
				});
				expect(mockedFromIni).toHaveBeenNthCalledWith(2, {
					profile: 'profile2',
					clientConfig: { region: 'us-east-1' },
				});
				expect(mockedFromIni).toHaveBeenNthCalledWith(3, {
					profile: 'profile3',
					clientConfig: { region: 'us-east-1' },
				});
			});
		});
	});

	describe('integration scenarios', () => {
		it('should work with EKS Pod Identity (tokenFile)', async () => {
			const eksCredentials: AwsCredentialIdentity = {
				accessKeyId: 'ASIAXXX',
				secretAccessKey: 'eksSecret',
				sessionToken: 'eksToken',
			};

			const eksProvider: AwsCredentialIdentityProvider = jest
				.fn()
				.mockResolvedValue(eksCredentials);
			mockedFromTokenFile.mockReturnValue(eksProvider);

			const result = await resolveCredentials({
				source: 'tokenFile',
				region: 'us-west-2',
			});

			expect(result.accessKeyId).toBe('ASIAXXX');
			expect(result.sessionToken).toBe('eksToken');
		});

		it('should work with ECS Task Role (containerMetadata)', async () => {
			const ecsCredentials: AwsCredentialIdentity = {
				accessKeyId: 'ASIAECSXXX',
				secretAccessKey: 'ecsSecret',
				sessionToken: 'ecsToken',
			};

			const ecsProvider: AwsCredentialIdentityProvider = jest
				.fn()
				.mockResolvedValue(ecsCredentials);
			mockedFromContainerMetadata.mockReturnValue(ecsProvider);

			const result = await resolveCredentials({
				source: 'containerMetadata',
				region: 'us-east-1',
			});

			expect(result.accessKeyId).toBe('ASIAECSXXX');
		});

		it('should work with EC2 Instance Profile (instanceMetadata)', async () => {
			const ec2Credentials: AwsCredentialIdentity = {
				accessKeyId: 'ASIAEC2XXX',
				secretAccessKey: 'ec2Secret',
				sessionToken: 'ec2Token',
			};

			const ec2Provider: AwsCredentialIdentityProvider = jest
				.fn()
				.mockResolvedValue(ec2Credentials);
			mockedFromInstanceMetadata.mockReturnValue(ec2Provider);

			const result = await resolveCredentials({
				source: 'instanceMetadata',
				region: 'eu-central-1',
			});

			expect(result.accessKeyId).toBe('ASIAEC2XXX');
		});

		it('should work with SSO profiles via fromIni', async () => {
			const ssoCredentials: AwsCredentialIdentity = {
				accessKeyId: 'ASIASSOXXX',
				secretAccessKey: 'ssoSecret',
				sessionToken: 'ssoToken',
			};

			const ssoProvider: AwsCredentialIdentityProvider = jest
				.fn()
				.mockResolvedValue(ssoCredentials);
			mockedFromIni.mockReturnValue(ssoProvider);

			const result = await resolveCredentials({
				source: 'profile',
				region: 'us-east-1',
				profile: 'sso-profile',
			});

			expect(result.accessKeyId).toBe('ASIASSOXXX');
			expect(mockedFromIni).toHaveBeenCalledWith({
				profile: 'sso-profile',
				clientConfig: { region: 'us-east-1' },
			});
		});
	});
});
