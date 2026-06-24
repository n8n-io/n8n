import { UserError } from 'n8n-workflow';

const {
	mockContainer,
	MockSecurityConfig,
	fromEnv,
	fromTokenFile,
	fromHttp,
	fromContainerMetadata,
	fromInstanceMetadata,
} = vi.hoisted(() => {
	class MockSecurityConfig {
		awsSystemCredentialsAccess = true;
		awsSystemCredentialsSdkSources = 'all';
	}
	return {
		mockContainer: { get: vi.fn() },
		MockSecurityConfig,
		fromEnv: vi.fn(),
		fromTokenFile: vi.fn(),
		fromHttp: vi.fn(),
		fromContainerMetadata: vi.fn(),
		fromInstanceMetadata: vi.fn(),
	};
});

vi.mock('@n8n/di', () => ({ Container: mockContainer }));
vi.mock('@n8n/config', () => ({ SecurityConfig: MockSecurityConfig }));
vi.mock('@aws-sdk/credential-providers', () => ({
	fromEnv,
	fromTokenFile,
	fromHttp,
	fromContainerMetadata,
	fromInstanceMetadata,
}));

import { getSystemCredentials } from './system-credentials-utils';
import {
	resolveContainerMetadataViaSdk,
	resolveEnvironmentViaSdk,
	resolveInstanceMetadataViaSdk,
	resolvePodIdentityViaSdk,
	resolveWebIdentityViaSdk,
	usesSdk,
} from './system-credentials-sdk';

const mockEnvGetter = vi.fn();

const SDK_IDENTITY = {
	accessKeyId: 'sdk-access-key',
	secretAccessKey: 'sdk-secret-key',
	sessionToken: 'sdk-session-token',
};

const REMOTE_PROVIDER_CONFIG = { timeout: 2000, maxRetries: 0 };

describe('system-credentials-sdk', () => {
	let mockSecurityConfigInstance: InstanceType<typeof MockSecurityConfig>;

	const realProcessEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mirror the legacy test: route `process.env` reads through `mockEnvGetter`
		// so the per-source env pre-checks can be driven and asserted.
		process.env = new Proxy({} as NodeJS.ProcessEnv, {
			get: (_target, key) => (typeof key === 'string' ? mockEnvGetter(key) : undefined),
		});

		mockSecurityConfigInstance = new MockSecurityConfig();
		mockContainer.get.mockReturnValue(mockSecurityConfigInstance);

		mockEnvGetter.mockReturnValue(undefined);

		// Every provider factory returns a provider resolving the standard identity.
		const provider = vi.fn().mockResolvedValue(SDK_IDENTITY);
		fromEnv.mockReturnValue(provider);
		fromTokenFile.mockReturnValue(provider);
		fromHttp.mockReturnValue(provider);
		fromContainerMetadata.mockReturnValue(provider);
		fromInstanceMetadata.mockReturnValue(provider);
	});

	afterEach(() => {
		process.env = realProcessEnv;
	});

	describe('usesSdk', () => {
		it('returns true for every source when set to "all"', () => {
			mockSecurityConfigInstance.awsSystemCredentialsSdkSources = 'all';
			expect(usesSdk('environment')).toBe(true);
			expect(usesSdk('instanceMetadata')).toBe(true);
		});

		it('returns true for every source when empty', () => {
			mockSecurityConfigInstance.awsSystemCredentialsSdkSources = '';
			expect(usesSdk('podIdentity')).toBe(true);
		});

		it('returns false for every source when set to "none"', () => {
			mockSecurityConfigInstance.awsSystemCredentialsSdkSources = 'none';
			expect(usesSdk('environment')).toBe(false);
			expect(usesSdk('instanceMetadata')).toBe(false);
		});

		it('honors a comma-separated allow-list', () => {
			mockSecurityConfigInstance.awsSystemCredentialsSdkSources = 'environment, instanceMetadata';
			expect(usesSdk('environment')).toBe(true);
			expect(usesSdk('instanceMetadata')).toBe(true);
			expect(usesSdk('podIdentity')).toBe(false);
			expect(usesSdk('containerMetadata')).toBe(false);
		});
	});

	describe('per-source SDK resolvers', () => {
		describe('environment', () => {
			it('resolves via fromEnv when both keys are present', async () => {
				mockEnvGetter.mockImplementation((key: string) =>
					key === 'AWS_ACCESS_KEY_ID' || key === 'AWS_SECRET_ACCESS_KEY' ? 'set' : undefined,
				);

				const result = await resolveEnvironmentViaSdk();
				expect(result).toEqual(SDK_IDENTITY);
				expect(fromEnv).toHaveBeenCalledTimes(1);
			});

			it('returns null without calling the SDK when keys are missing', async () => {
				mockEnvGetter.mockReturnValue(undefined);

				const result = await resolveEnvironmentViaSdk();
				expect(result).toBeNull();
				expect(fromEnv).not.toHaveBeenCalled();
			});
		});

		describe('roleForServiceAccount (IRSA)', () => {
			beforeEach(() => {
				mockEnvGetter.mockImplementation((key: string) =>
					key === 'AWS_ROLE_ARN' || key === 'AWS_WEB_IDENTITY_TOKEN_FILE' ? 'set' : undefined,
				);
			});

			it('resolves via fromTokenFile when IRSA env is present', async () => {
				const result = await resolveWebIdentityViaSdk();
				expect(result).toEqual(SDK_IDENTITY);
				expect(fromTokenFile).toHaveBeenCalledWith({});
			});

			it('passes region to the STS client config when provided', async () => {
				const result = await resolveWebIdentityViaSdk('eu-west-1');
				expect(result).toEqual(SDK_IDENTITY);
				expect(fromTokenFile).toHaveBeenCalledWith({ clientConfig: { region: 'eu-west-1' } });
			});

			it('returns null without calling the SDK when IRSA env is absent', async () => {
				mockEnvGetter.mockReturnValue(undefined);

				const result = await resolveWebIdentityViaSdk();
				expect(result).toBeNull();
				expect(fromTokenFile).not.toHaveBeenCalled();
			});
		});

		describe('podIdentity', () => {
			it('passes the full URI and token sources to fromHttp', async () => {
				mockEnvGetter.mockImplementation((key: string) => {
					switch (key) {
						case 'AWS_CONTAINER_CREDENTIALS_FULL_URI':
							return 'http://169.254.170.23/v1/credentials';
						case 'AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE':
							return '/var/run/secrets/token';
						default:
							return undefined;
					}
				});

				const result = await resolvePodIdentityViaSdk();
				expect(result).toEqual(SDK_IDENTITY);
				expect(fromHttp).toHaveBeenCalledWith({
					awsContainerCredentialsFullUri: 'http://169.254.170.23/v1/credentials',
					awsContainerAuthorizationTokenFile: '/var/run/secrets/token',
					awsContainerAuthorizationToken: undefined,
					timeout: 2000,
					maxRetries: 0,
				});
			});

			it('returns null without calling the SDK when FULL_URI is absent', async () => {
				mockEnvGetter.mockReturnValue(undefined);

				const result = await resolvePodIdentityViaSdk();
				expect(result).toBeNull();
				expect(fromHttp).not.toHaveBeenCalled();
			});
		});

		describe('containerMetadata (ECS)', () => {
			it('uses fromContainerMetadata with the 2s/no-retry config', async () => {
				mockEnvGetter.mockImplementation((key: string) =>
					key === 'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI' ? '/v2/credentials/uuid' : undefined,
				);

				const result = await resolveContainerMetadataViaSdk();
				expect(result).toEqual(SDK_IDENTITY);
				expect(fromContainerMetadata).toHaveBeenCalledWith(REMOTE_PROVIDER_CONFIG);
			});

			it('returns null without calling the SDK when RELATIVE_URI is absent', async () => {
				mockEnvGetter.mockReturnValue(undefined);

				const result = await resolveContainerMetadataViaSdk();
				expect(result).toBeNull();
				expect(fromContainerMetadata).not.toHaveBeenCalled();
			});
		});

		describe('instanceMetadata (EC2)', () => {
			it('uses fromInstanceMetadata with the 2s/no-retry config', async () => {
				const result = await resolveInstanceMetadataViaSdk();
				expect(result).toEqual(SDK_IDENTITY);
				expect(fromInstanceMetadata).toHaveBeenCalledWith(REMOTE_PROVIDER_CONFIG);
			});
		});

		describe('mapping and error handling', () => {
			it('omits the session token when the SDK identity has none', async () => {
				fromInstanceMetadata.mockReturnValue(
					vi.fn().mockResolvedValue({
						accessKeyId: 'a',
						secretAccessKey: 'b',
					}),
				);

				const result = await resolveInstanceMetadataViaSdk();
				expect(result).toEqual({ accessKeyId: 'a', secretAccessKey: 'b', sessionToken: undefined });
			});

			it('returns null when the SDK identity is incomplete', async () => {
				fromInstanceMetadata.mockReturnValue(vi.fn().mockResolvedValue({ accessKeyId: 'a' }));

				const result = await resolveInstanceMetadataViaSdk();
				expect(result).toBeNull();
			});

			it('returns null (never throws) when the provider rejects', async () => {
				fromInstanceMetadata.mockReturnValue(
					vi.fn().mockRejectedValue(new Error('metadata unavailable')),
				);

				await expect(resolveInstanceMetadataViaSdk()).resolves.toBeNull();
			});
		});
	});

	describe('getSystemCredentials (SDK path)', () => {
		it('throws UserError when access is disabled, before touching the SDK', async () => {
			mockSecurityConfigInstance.awsSystemCredentialsAccess = false;

			await expect(getSystemCredentials('us-east-1')).rejects.toThrow(UserError);
			expect(fromEnv).not.toHaveBeenCalled();
			expect(fromInstanceMetadata).not.toHaveBeenCalled();
		});

		it('returns the first resolvable source with its source label', async () => {
			mockEnvGetter.mockImplementation((key: string) =>
				key === 'AWS_ACCESS_KEY_ID' || key === 'AWS_SECRET_ACCESS_KEY' ? 'set' : undefined,
			);

			const result = await getSystemCredentials('us-east-1');
			expect(result).toEqual({ ...SDK_IDENTITY, source: 'environment' });
		});

		it('preserves source order, falling through unconfigured sources to EC2', async () => {
			// No env/IRSA/pod/ECS env vars set, so only instanceMetadata resolves.
			mockEnvGetter.mockReturnValue(undefined);

			const result = await getSystemCredentials('us-east-1');
			expect(result).toEqual({ ...SDK_IDENTITY, source: 'instanceMetadata' });
			expect(fromEnv).not.toHaveBeenCalled();
			expect(fromTokenFile).not.toHaveBeenCalled();
		});

		it('resolves the IRSA source via the SDK', async () => {
			mockEnvGetter.mockImplementation((key: string) =>
				key === 'AWS_ROLE_ARN' || key === 'AWS_WEB_IDENTITY_TOKEN_FILE' ? 'set' : undefined,
			);

			const result = await getSystemCredentials('us-east-1');
			expect(result).toEqual({ ...SDK_IDENTITY, source: 'roleForServiceAccount' });
			expect(fromTokenFile).toHaveBeenCalledWith({ clientConfig: { region: 'us-east-1' } });
		});
	});
});
