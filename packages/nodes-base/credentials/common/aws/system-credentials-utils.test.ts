import { ApplicationError } from 'n8n-workflow';

global.fetch = jest.fn();

class MockSecurityConfig {
	awsSystemCredentialsAccess = true;
}

jest.mock('@n8n/di', () => ({
	Container: {
		get: jest.fn(),
	},
}));

jest.mock('@n8n/config', () => ({
	SecurityConfig: MockSecurityConfig,
}));

import { Container } from '@n8n/di';
import * as systemCredentialsUtils from './system-credentials-utils';

const mockEnvGetter = jest.fn();

jest.spyOn(systemCredentialsUtils, 'envGetter').mockImplementation(mockEnvGetter);

const { envGetter, getSystemCredentials, credentialsResolver } = systemCredentialsUtils;

describe('system-credentials-utils', () => {
	let mockSecurityConfigInstance: MockSecurityConfig;

	beforeEach(() => {
		jest.clearAllMocks();

		mockSecurityConfigInstance = new MockSecurityConfig();
		(Container.get as jest.Mock).mockReturnValue(mockSecurityConfigInstance);

		mockEnvGetter.mockReturnValue(undefined);

		(global.fetch as jest.Mock).mockReset();
	});

	describe('envGetter', () => {
		it('should be called with correct environment variable names', () => {
			mockEnvGetter.mockReturnValue('test-value');

			const result = envGetter('TEST_VAR');
			expect(mockEnvGetter).toHaveBeenCalledWith('TEST_VAR');
			expect(result).toBe('test-value');
		});
	});

	describe('getSystemCredentials', () => {
		it('should throw ApplicationError when AWS system credentials access is disabled', async () => {
			mockSecurityConfigInstance.awsSystemCredentialsAccess = false;

			await expect(getSystemCredentials()).rejects.toThrow(ApplicationError);
			await expect(getSystemCredentials()).rejects.toThrow(
				'Access to AWS system credentials disabled, contact your administrator.',
			);
		});

		it('should return credentials from environment resolver', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				switch (key) {
					case 'AWS_ACCESS_KEY_ID':
						return 'test-access-key';
					case 'AWS_SECRET_ACCESS_KEY':
						return 'test-secret-key';
					case 'AWS_SESSION_TOKEN':
						return 'test-session-token';
					default:
						return undefined;
				}
			});

			const result = await getSystemCredentials();
			expect(result).toEqual({
				accessKeyId: 'test-access-key',
				secretAccessKey: 'test-secret-key',
				sessionToken: 'test-session-token',
				source: 'environment',
			});
		});

		it('should return null when no credentials are found', async () => {
			mockEnvGetter.mockReturnValue(undefined);
			(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

			const result = await getSystemCredentials();
			expect(result).toBeNull();
		});
	});

	describe('getEnvironmentCredentials', () => {
		it('should return credentials when AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are available via envGetter', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				switch (key) {
					case 'AWS_ACCESS_KEY_ID':
						return '  test-access-key  ';
					case 'AWS_SECRET_ACCESS_KEY':
						return '  test-secret-key  ';
					case 'AWS_SESSION_TOKEN':
						return '  test-session-token  ';
					default:
						return undefined;
				}
			});

			const result = await credentialsResolver.environment();
			expect(result).toEqual({
				accessKeyId: 'test-access-key',
				secretAccessKey: 'test-secret-key',
				sessionToken: 'test-session-token',
			});

			expect(mockEnvGetter).toHaveBeenCalledWith('AWS_ACCESS_KEY_ID');
			expect(mockEnvGetter).toHaveBeenCalledWith('AWS_SECRET_ACCESS_KEY');
			expect(mockEnvGetter).toHaveBeenCalledWith('AWS_SESSION_TOKEN');
		});

		it('should return credentials without session token when only access key and secret are available', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				switch (key) {
					case 'AWS_ACCESS_KEY_ID':
						return 'test-access-key';
					case 'AWS_SECRET_ACCESS_KEY':
						return 'test-secret-key';
					case 'AWS_SESSION_TOKEN':
						return undefined;
					default:
						return undefined;
				}
			});

			const result = await credentialsResolver.environment();
			expect(result).toEqual({
				accessKeyId: 'test-access-key',
				secretAccessKey: 'test-secret-key',
				sessionToken: undefined,
			});
		});

		it('should return null when AWS_ACCESS_KEY_ID is missing', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				switch (key) {
					case 'AWS_ACCESS_KEY_ID':
						return undefined;
					case 'AWS_SECRET_ACCESS_KEY':
						return 'test-secret-key';
					default:
						return undefined;
				}
			});

			const result = await credentialsResolver.environment();
			expect(result).toBeNull();
		});

		it('should return null when AWS_SECRET_ACCESS_KEY is missing', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				switch (key) {
					case 'AWS_ACCESS_KEY_ID':
						return 'test-access-key';
					case 'AWS_SECRET_ACCESS_KEY':
						return undefined;
					default:
						return undefined;
				}
			});

			const result = await credentialsResolver.environment();
			expect(result).toBeNull();
		});

		it('should trim whitespace from credentials', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				switch (key) {
					case 'AWS_ACCESS_KEY_ID':
						return '  test-access-key  ';
					case 'AWS_SECRET_ACCESS_KEY':
						return '  test-secret-key  ';
					case 'AWS_SESSION_TOKEN':
						return '  test-session-token  ';
					default:
						return undefined;
				}
			});

			const result = await credentialsResolver.environment();
			expect(result?.accessKeyId).toBe('test-access-key');
			expect(result?.secretAccessKey).toBe('test-secret-key');
			expect(result?.sessionToken).toBe('test-session-token');
		});
	});

	describe('getContainerMetadataCredentials', () => {
		it('should return null when AWS_CONTAINER_CREDENTIALS_RELATIVE_URI is not available via envGetter', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				if (key === 'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI') {
					return undefined;
				}
				return undefined;
			});

			const result = await credentialsResolver.containerMetadata();
			expect(result).toBeNull();
			expect(mockEnvGetter).toHaveBeenCalledWith('AWS_CONTAINER_CREDENTIALS_RELATIVE_URI');
		});

		it('should fetch credentials successfully with relative URI from envGetter', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				switch (key) {
					case 'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI':
						return '/v2/credentials/test-uuid';
					case 'AWS_CONTAINER_AUTHORIZATION_TOKEN':
						return undefined;
					default:
						return undefined;
				}
			});

			const mockCredentials = {
				AccessKeyId: 'test-access-key',
				SecretAccessKey: 'test-secret-key',
				Token: 'test-token',
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue(mockCredentials),
			});

			const result = await credentialsResolver.containerMetadata();
			expect(result).toEqual({
				accessKeyId: 'test-access-key',
				secretAccessKey: 'test-secret-key',
				sessionToken: 'test-token',
			});

			expect(mockEnvGetter).toHaveBeenCalledWith('AWS_CONTAINER_CREDENTIALS_RELATIVE_URI');
			expect(mockEnvGetter).toHaveBeenCalledWith('AWS_CONTAINER_AUTHORIZATION_TOKEN');
			expect(global.fetch).toHaveBeenCalledWith(
				'http://169.254.170.2/v2/credentials/test-uuid',
				expect.objectContaining({
					method: 'GET',
					headers: {
						'User-Agent': 'n8n-aws-credential',
					},
				}),
			);
		});

		it('should include authorization header when AWS_CONTAINER_AUTHORIZATION_TOKEN is available via envGetter', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				switch (key) {
					case 'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI':
						return '/v2/credentials/test-uuid';
					case 'AWS_CONTAINER_AUTHORIZATION_TOKEN':
						return 'test-auth-token';
					default:
						return undefined;
				}
			});

			const mockCredentials = {
				AccessKeyId: 'test-access-key',
				SecretAccessKey: 'test-secret-key',
				Token: 'test-token',
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue(mockCredentials),
			});

			await credentialsResolver.containerMetadata();

			expect(global.fetch).toHaveBeenCalledWith(
				'http://169.254.170.2/v2/credentials/test-uuid',
				expect.objectContaining({
					headers: {
						'User-Agent': 'n8n-aws-credential',
						Authorization: 'Bearer test-auth-token',
					},
				}),
			);
		});

		it('should return null when fetch fails', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				if (key === 'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI') {
					return '/v2/credentials/test-uuid';
				}
				return undefined;
			});

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
			});

			const result = await credentialsResolver.containerMetadata();
			expect(result).toBeNull();
		});

		it('should return null when fetch throws an error', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				if (key === 'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI') {
					return '/v2/credentials/test-uuid';
				}
				return undefined;
			});

			(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

			const result = await credentialsResolver.containerMetadata();
			expect(result).toBeNull();
		});
	});

	describe('getPodIdentityCredentials', () => {
		it('should return null when AWS_CONTAINER_CREDENTIALS_FULL_URI is not available via envGetter', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				if (key === 'AWS_CONTAINER_CREDENTIALS_FULL_URI') {
					return undefined;
				}
				return undefined;
			});

			const result = await credentialsResolver.podIdentity();
			expect(result).toBeNull();
			expect(mockEnvGetter).toHaveBeenCalledWith('AWS_CONTAINER_CREDENTIALS_FULL_URI');
		});

		it('should fetch credentials successfully with full URI from envGetter', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				switch (key) {
					case 'AWS_CONTAINER_CREDENTIALS_FULL_URI':
						return 'https://eks-pod-identity.amazonaws.com/v1/credentials';
					case 'AWS_CONTAINER_AUTHORIZATION_TOKEN':
						return undefined;
					default:
						return undefined;
				}
			});

			const mockCredentials = {
				AccessKeyId: 'test-access-key',
				SecretAccessKey: 'test-secret-key',
				Token: 'test-token',
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue(mockCredentials),
			});

			const result = await credentialsResolver.podIdentity();
			expect(result).toEqual({
				accessKeyId: 'test-access-key',
				secretAccessKey: 'test-secret-key',
				sessionToken: 'test-token',
			});

			expect(mockEnvGetter).toHaveBeenCalledWith('AWS_CONTAINER_CREDENTIALS_FULL_URI');
			expect(mockEnvGetter).toHaveBeenCalledWith('AWS_CONTAINER_AUTHORIZATION_TOKEN');
			expect(global.fetch).toHaveBeenCalledWith(
				'https://eks-pod-identity.amazonaws.com/v1/credentials',
				expect.objectContaining({
					method: 'GET',
					headers: {
						'User-Agent': 'n8n-aws-credential',
					},
				}),
			);
		});

		it('should include authorization header when AWS_CONTAINER_AUTHORIZATION_TOKEN is available via envGetter', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				switch (key) {
					case 'AWS_CONTAINER_CREDENTIALS_FULL_URI':
						return 'https://eks-pod-identity.amazonaws.com/v1/credentials';
					case 'AWS_CONTAINER_AUTHORIZATION_TOKEN':
						return 'test-auth-token';
					default:
						return undefined;
				}
			});

			const mockCredentials = {
				AccessKeyId: 'test-access-key',
				SecretAccessKey: 'test-secret-key',
				Token: 'test-token',
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue(mockCredentials),
			});

			await credentialsResolver.podIdentity();

			expect(global.fetch).toHaveBeenCalledWith(
				'https://eks-pod-identity.amazonaws.com/v1/credentials',
				expect.objectContaining({
					headers: {
						'User-Agent': 'n8n-aws-credential',
						Authorization: 'Bearer test-auth-token',
					},
				}),
			);
		});

		it('should return null when fetch fails', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				if (key === 'AWS_CONTAINER_CREDENTIALS_FULL_URI') {
					return 'https://eks-pod-identity.amazonaws.com/v1/credentials';
				}
				return undefined;
			});

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
			});

			const result = await credentialsResolver.podIdentity();
			expect(result).toBeNull();
		});

		it('should return null when fetch throws an error', async () => {
			mockEnvGetter.mockImplementation((key: string) => {
				if (key === 'AWS_CONTAINER_CREDENTIALS_FULL_URI') {
					return 'https://eks-pod-identity.amazonaws.com/v1/credentials';
				}
				return undefined;
			});

			(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

			const result = await credentialsResolver.podIdentity();
			expect(result).toBeNull();
		});
	});

	describe('getInstanceMetadataCredentials', () => {
		it('should fetch credentials successfully from EC2 instance metadata', async () => {
			const mockCredentials = {
				AccessKeyId: 'test-access-key',
				SecretAccessKey: 'test-secret-key',
				Token: 'test-token',
			};

			(global.fetch as jest.Mock)
				.mockResolvedValueOnce({
					ok: true,
					text: jest.fn().mockResolvedValue('test-token'),
				})
				.mockResolvedValueOnce({
					ok: true,
					text: jest.fn().mockResolvedValue('test-role'),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue(mockCredentials),
				});

			const result = await credentialsResolver.instanceMetadata();
			expect(result).toEqual({
				accessKeyId: 'test-access-key',
				secretAccessKey: 'test-secret-key',
				sessionToken: 'test-token',
			});

			expect(global.fetch).toHaveBeenCalledTimes(3);
		});

		it('should fallback to IMDSv1 when IMDSv2 token request fails', async () => {
			const mockCredentials = {
				AccessKeyId: 'test-access-key',
				SecretAccessKey: 'test-secret-key',
				Token: 'test-token',
			};

			(global.fetch as jest.Mock)
				.mockRejectedValueOnce(new Error('Token request failed'))
				.mockResolvedValueOnce({
					ok: true,
					text: jest.fn().mockResolvedValue('test-role'),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue(mockCredentials),
				});

			const result = await credentialsResolver.instanceMetadata();
			expect(result).toEqual({
				accessKeyId: 'test-access-key',
				secretAccessKey: 'test-secret-key',
				sessionToken: 'test-token',
			});
		});

		it('should return null when role name request fails', async () => {
			(global.fetch as jest.Mock)
				.mockResolvedValueOnce({
					ok: true,
					text: jest.fn().mockResolvedValue('test-token'),
				})
				.mockResolvedValueOnce({
					ok: false,
				});

			const result = await credentialsResolver.instanceMetadata();
			expect(result).toBeNull();
		});

		it('should return null when credentials are incomplete', async () => {
			const incompleteCredentials = {
				AccessKeyId: 'test-access-key',
			};

			(global.fetch as jest.Mock)
				.mockResolvedValueOnce({
					ok: true,
					text: jest.fn().mockResolvedValue('test-token'),
				})
				.mockResolvedValueOnce({
					ok: true,
					text: jest.fn().mockResolvedValue('test-role'),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue(incompleteCredentials),
				});

			const result = await credentialsResolver.instanceMetadata();
			expect(result).toBeNull();
		});

		it('should return null when fetch throws an error', async () => {
			(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

			const result = await credentialsResolver.instanceMetadata();
			expect(result).toBeNull();
		});
	});
});
