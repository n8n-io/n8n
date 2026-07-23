import { UserError } from 'n8n-workflow';

global.fetch = vi.fn();

const {
	mockContainer,
	MockSecurityConfig,
	fromEnv,
	fromWebToken,
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
		fromWebToken: vi.fn(),
		fromHttp: vi.fn(),
		fromContainerMetadata: vi.fn(),
		fromInstanceMetadata: vi.fn(),
	};
});

const { mockReadFile } = vi.hoisted(() => ({
	mockReadFile: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({ readFile: mockReadFile }));
vi.mock('@n8n/di', () => ({ Container: mockContainer }));
vi.mock('@n8n/config', () => ({ SecurityConfig: MockSecurityConfig }));
vi.mock('@aws-sdk/credential-providers', () => ({
	fromEnv,
	fromWebToken,
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
		(global.fetch as ReturnType<typeof vi.fn>).mockReset();

		// Every provider factory returns a provider resolving the standard identity.
		const provider = vi.fn().mockResolvedValue(SDK_IDENTITY);
		fromEnv.mockReturnValue(provider);
		fromWebToken.mockReturnValue(provider);
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
			it('returns trimmed credentials when both keys are present', async () => {
				mockEnvGetter.mockImplementation((key: string) => {
					if (key === 'AWS_ACCESS_KEY_ID') return 'AKIAIOSFODNN7EXAMPLE\n';
					if (key === 'AWS_SECRET_ACCESS_KEY') return 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\n';
					if (key === 'AWS_SESSION_TOKEN') return 'token-value\n';
					return undefined;
				});

				const result = await resolveEnvironmentViaSdk();
				expect(result).toEqual({
					accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
					sessionToken: 'token-value',
				});
			});

			it('returns null when keys are missing', async () => {
				mockEnvGetter.mockReturnValue(undefined);

				const result = await resolveEnvironmentViaSdk();
				expect(result).toBeNull();
			});
		});

		describe('roleForServiceAccount (IRSA)', () => {
			beforeEach(() => {
				mockEnvGetter.mockImplementation((key: string) =>
					key === 'AWS_ROLE_ARN'
						? 'arn:aws:iam::123456789012:role/my-role'
						: key === 'AWS_WEB_IDENTITY_TOKEN_FILE'
							? '/var/run/secrets/eks.amazonaws.com/serviceaccount/token'
							: undefined,
				);
				mockReadFile.mockResolvedValue('jwt-token\n');
			});

			it('reads and trims the token, then resolves via fromWebToken with the pinned session name', async () => {
				const result = await resolveWebIdentityViaSdk();
				expect(result).toEqual(SDK_IDENTITY);
				expect(mockReadFile).toHaveBeenCalledWith(
					'/var/run/secrets/eks.amazonaws.com/serviceaccount/token',
					'utf-8',
				);
				expect(fromWebToken).toHaveBeenCalledWith({
					webIdentityToken: 'jwt-token',
					roleArn: 'arn:aws:iam::123456789012:role/my-role',
					roleSessionName: 'n8n-web-identity-session',
					clientConfig: {
						maxAttempts: 1,
						requestHandler: { requestTimeout: 2000, connectionTimeout: 2000 },
					},
				});
			});

			it('passes region to the STS client config when provided', async () => {
				const result = await resolveWebIdentityViaSdk('eu-west-1');
				expect(result).toEqual(SDK_IDENTITY);
				expect(fromWebToken).toHaveBeenCalledWith({
					webIdentityToken: 'jwt-token',
					roleArn: 'arn:aws:iam::123456789012:role/my-role',
					roleSessionName: 'n8n-web-identity-session',
					clientConfig: {
						region: 'eu-west-1',
						maxAttempts: 1,
						requestHandler: { requestTimeout: 2000, connectionTimeout: 2000 },
					},
				});
			});

			it('returns null without calling the SDK when IRSA env is absent', async () => {
				mockEnvGetter.mockReturnValue(undefined);

				const result = await resolveWebIdentityViaSdk();
				expect(result).toBeNull();
				expect(fromWebToken).not.toHaveBeenCalled();
			});

			it('returns null without calling the SDK when the token file is unreadable', async () => {
				mockReadFile.mockRejectedValue(new Error('ENOENT'));

				const result = await resolveWebIdentityViaSdk();
				expect(result).toBeNull();
				expect(fromWebToken).not.toHaveBeenCalled();
			});

			it('returns null without calling the SDK when the token file is empty', async () => {
				mockReadFile.mockResolvedValue('   \n');

				const result = await resolveWebIdentityViaSdk();
				expect(result).toBeNull();
				expect(fromWebToken).not.toHaveBeenCalled();
			});
		});

		describe('podIdentity', () => {
			it('reads and trims the token file, passes it as the sole auth token to fromHttp', async () => {
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
				mockReadFile.mockResolvedValue('tok123\n');

				const result = await resolvePodIdentityViaSdk();
				expect(result).toEqual(SDK_IDENTITY);
				expect(mockReadFile).toHaveBeenCalledWith('/var/run/secrets/token', 'utf-8');
				expect(fromHttp).toHaveBeenCalledWith({
					awsContainerCredentialsFullUri: 'http://169.254.170.23/v1/credentials',
					awsContainerAuthorizationToken: 'tok123',
					timeout: 2000,
					maxRetries: 0,
				});
			});

			it('falls back to the direct token when no token file is configured', async () => {
				mockEnvGetter.mockImplementation((key: string) => {
					switch (key) {
						case 'AWS_CONTAINER_CREDENTIALS_FULL_URI':
							return 'http://169.254.170.23/v1/credentials';
						case 'AWS_CONTAINER_AUTHORIZATION_TOKEN':
							return 'direct-token';
						default:
							return undefined;
					}
				});

				const result = await resolvePodIdentityViaSdk();
				expect(result).toEqual(SDK_IDENTITY);
				expect(mockReadFile).not.toHaveBeenCalled();
				expect(fromHttp).toHaveBeenCalledWith({
					awsContainerCredentialsFullUri: 'http://169.254.170.23/v1/credentials',
					awsContainerAuthorizationToken: 'direct-token',
					timeout: 2000,
					maxRetries: 0,
				});
			});

			it('falls back to the direct token when the token file is unreadable', async () => {
				mockEnvGetter.mockImplementation((key: string) => {
					switch (key) {
						case 'AWS_CONTAINER_CREDENTIALS_FULL_URI':
							return 'http://169.254.170.23/v1/credentials';
						case 'AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE':
							return '/var/run/secrets/token';
						case 'AWS_CONTAINER_AUTHORIZATION_TOKEN':
							return 'direct-token';
						default:
							return undefined;
					}
				});
				mockReadFile.mockRejectedValue(new Error('ENOENT'));

				const result = await resolvePodIdentityViaSdk();
				expect(result).toEqual(SDK_IDENTITY);
				expect(fromHttp).toHaveBeenCalledWith({
					awsContainerCredentialsFullUri: 'http://169.254.170.23/v1/credentials',
					awsContainerAuthorizationToken: 'direct-token',
					timeout: 2000,
					maxRetries: 0,
				});
			});

			it('falls back to the direct token when the token file is empty', async () => {
				mockEnvGetter.mockImplementation((key: string) => {
					switch (key) {
						case 'AWS_CONTAINER_CREDENTIALS_FULL_URI':
							return 'http://169.254.170.23/v1/credentials';
						case 'AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE':
							return '/var/run/secrets/token';
						case 'AWS_CONTAINER_AUTHORIZATION_TOKEN':
							return 'direct-token';
						default:
							return undefined;
					}
				});
				mockReadFile.mockResolvedValue('   \n');

				const result = await resolvePodIdentityViaSdk();
				expect(result).toEqual(SDK_IDENTITY);
				expect(fromHttp).toHaveBeenCalledWith({
					awsContainerCredentialsFullUri: 'http://169.254.170.23/v1/credentials',
					awsContainerAuthorizationToken: 'direct-token',
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
			mockEnvGetter.mockImplementation((key: string) => {
				if (key === 'AWS_ACCESS_KEY_ID') return 'AKIAIOSFODNN7EXAMPLE';
				if (key === 'AWS_SECRET_ACCESS_KEY') return 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
				return undefined;
			});

			const result = await getSystemCredentials('us-east-1');
			expect(result).toEqual({
				accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
				secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
				sessionToken: undefined,
				source: 'environment',
			});
		});

		it('preserves source order, falling through unconfigured sources to EC2', async () => {
			// No env/IRSA/pod/ECS env vars set, so only instanceMetadata resolves.
			mockEnvGetter.mockReturnValue(undefined);

			const result = await getSystemCredentials('us-east-1');
			expect(result).toEqual({ ...SDK_IDENTITY, source: 'instanceMetadata' });
			expect(fromEnv).not.toHaveBeenCalled();
			expect(fromWebToken).not.toHaveBeenCalled();
		});

		it('when both FULL_URI (podIdentity) and RELATIVE_URI (ECS) are set, podIdentity wins and ECS is never tried', async () => {
			// Guards the podIdentity→containerMetadata ordering. fromContainerMetadata natively
			// also reads FULL_URI, so a reorder in the chain would silently pass every factory
			// mock (they all return the same identity) — but this test would catch it.
			mockEnvGetter.mockImplementation((key: string) => {
				if (key === 'AWS_CONTAINER_CREDENTIALS_FULL_URI')
					return 'http://169.254.170.23/v1/credentials';
				if (key === 'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI') return '/v2/credentials/uuid';
				return undefined;
			});

			const result = await getSystemCredentials('us-east-1');
			expect(result).toEqual({ ...SDK_IDENTITY, source: 'podIdentity' });
			expect(fromHttp).toHaveBeenCalledTimes(1);
			expect(fromContainerMetadata).not.toHaveBeenCalled();
		});

		it('resolves the IRSA source via the SDK', async () => {
			mockEnvGetter.mockImplementation((key: string) =>
				key === 'AWS_ROLE_ARN' || key === 'AWS_WEB_IDENTITY_TOKEN_FILE' ? 'set' : undefined,
			);
			mockReadFile.mockResolvedValue('jwt-token\n');

			const result = await getSystemCredentials('us-east-1');
			expect(result).toEqual({ ...SDK_IDENTITY, source: 'roleForServiceAccount' });
			expect(fromWebToken).toHaveBeenCalledWith({
				webIdentityToken: 'jwt-token',
				roleArn: 'set',
				roleSessionName: 'n8n-web-identity-session',
				clientConfig: { region: 'us-east-1', maxAttempts: 1, requestHandler: expect.any(Object) },
			});
		});
	});

	// SDK/legacy parity for the ECS containerMetadata source. Unlike the environment
	// source (pure env reads, no I/O), ECS makes an HTTP request — so we compare at
	// the HTTP layer for the legacy path and at the factory-args layer for the SDK path.
	// Key documented divergence: legacy sends `Authorization: Bearer <token>`; the SDK
	// sends the token raw (no Bearer prefix). The ECS metadata agent does not validate
	// the scheme, so both work in practice. See the comment in resolveContainerMetadataViaSdk.
	describe('SDK/legacy parity (containerMetadata ECS auth header)', () => {
		const RELATIVE_URI = '/v2/credentials/uuid';
		const AUTH_TOKEN = 'ecs-auth-token';
		const ECS_RESPONSE = { AccessKeyId: 'AKIAx', SecretAccessKey: 'secret', Token: 'session' };

		beforeEach(() => {
			mockEnvGetter.mockImplementation((key: string) => {
				if (key === 'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI') return RELATIVE_URI;
				if (key === 'AWS_CONTAINER_AUTHORIZATION_TOKEN') return AUTH_TOKEN;
				return undefined;
			});
		});

		it('legacy path sends Authorization: Bearer <token>', async () => {
			mockSecurityConfigInstance.awsSystemCredentialsSdkSources = 'none';
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue(ECS_RESPONSE),
			});

			const result = await getSystemCredentials('us-east-1');
			expect(result?.source).toBe('containerMetadata');
			expect(global.fetch).toHaveBeenCalledWith(
				`http://169.254.170.2${RELATIVE_URI}`,
				expect.objectContaining({
					headers: expect.objectContaining({ Authorization: `Bearer ${AUTH_TOKEN}` }),
				}),
			);
		});

		it('SDK path passes no auth to the factory; fromContainerMetadata reads env and sends token raw (no Bearer prefix)', async () => {
			mockSecurityConfigInstance.awsSystemCredentialsSdkSources = 'all';

			const result = await getSystemCredentials('us-east-1');
			expect(result?.source).toBe('containerMetadata');
			// Auth token is read from env by fromContainerMetadata internally — not passed
			// through factory args — so the SDK sends the raw value without a Bearer prefix.
			expect(fromContainerMetadata).toHaveBeenCalledWith(REMOTE_PROVIDER_CONFIG);
			expect(global.fetch).not.toHaveBeenCalled();
		});
	});

	// Guards the SDK path against value-level drift from the legacy path. The
	// `environment` source is the only one resolvable purely from process.env with
	// no network I/O, so the SDK (`all`) and legacy (`none`) flows can be compared
	// byte-for-byte. This locks in the trim contract that regressed once already:
	// resolving via `fromEnv()` (which returns process.env verbatim) instead of
	// trimming would make these assertions fail.
	describe('SDK/legacy parity (environment source)', () => {
		it.each([
			['clean values', 'AKIAIOSFODNN7EXAMPLE', 'wJalrXUtnFEMI/K7MDENG', 'session-token'],
			['trailing newlines', 'AKIAIOSFODNN7EXAMPLE\n', 'wJalrXUtnFEMI/K7MDENG\n', 'session-token\n'],
			[
				'surrounding whitespace',
				'  AKIAIOSFODNN7EXAMPLE  ',
				'\twJalrXUtnFEMI/K7MDENG\t',
				' session-token ',
			],
		])(
			'resolves identically via SDK and legacy (%s)',
			async (_label, rawAccessKeyId, rawSecretAccessKey, rawSessionToken) => {
				mockEnvGetter.mockImplementation((key: string) => {
					if (key === 'AWS_ACCESS_KEY_ID') return rawAccessKeyId;
					if (key === 'AWS_SECRET_ACCESS_KEY') return rawSecretAccessKey;
					if (key === 'AWS_SESSION_TOKEN') return rawSessionToken;
					return undefined;
				});

				mockSecurityConfigInstance.awsSystemCredentialsSdkSources = 'all';
				const viaSdk = await getSystemCredentials('us-east-1');

				mockSecurityConfigInstance.awsSystemCredentialsSdkSources = 'none';
				const viaLegacy = await getSystemCredentials('us-east-1');

				expect(viaSdk).toEqual(viaLegacy);
				expect(viaSdk).toEqual({
					accessKeyId: rawAccessKeyId.trim(),
					secretAccessKey: rawSecretAccessKey.trim(),
					sessionToken: rawSessionToken.trim(),
					source: 'environment',
				});
			},
		);
	});
});
