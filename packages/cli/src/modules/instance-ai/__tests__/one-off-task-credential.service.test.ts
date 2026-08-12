import type { CredentialsEntity, User, UserRepository } from '@n8n/db';
import { OperationalError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { OauthService } from '@/oauth/oauth.service';

import {
	credentialEnvVarName,
	OneOffTaskCredentialService,
	resolvedCredentialEnvSchema,
} from '../one-off-task-credential.service';

const fakeUser = mock<User>({ id: 'user-1' });

/** `knownCredentials` is a getter on the real class, so define it on the mock. */
function setKnownCredentials(
	loadNodesAndCredentials: LoadNodesAndCredentials,
	value: LoadNodesAndCredentials['knownCredentials'],
) {
	Object.defineProperty(loadNodesAndCredentials, 'knownCredentials', {
		value,
		configurable: true,
	});
}

const staticCredential = mock<CredentialsEntity>({
	id: 'cred-static',
	name: 'My Api Key',
	type: 'acmeApi',
	isGlobal: false,
	shared: [{ projectId: 'project-1', role: 'credential:owner' }],
});

const oauthCredential = mock<CredentialsEntity>({
	id: 'cred-oauth',
	name: 'Google Sheets account',
	type: 'googleSheetsOAuth2Api',
	isGlobal: false,
	shared: [{ projectId: 'project-1', role: 'credential:owner' }],
});

function createService() {
	const userRepository = mock<UserRepository>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const credentialsService = mock<CredentialsService>();
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();
	const oauthService = mock<OauthService>();

	userRepository.findOne.mockResolvedValue(fakeUser);
	setKnownCredentials(loadNodesAndCredentials, {});

	const service = new OneOffTaskCredentialService(
		userRepository,
		credentialsFinderService,
		credentialsService,
		loadNodesAndCredentials,
		oauthService,
	);

	return {
		service,
		userRepository,
		credentialsFinderService,
		credentialsService,
		loadNodesAndCredentials,
		oauthService,
	};
}

describe('OneOffTaskCredentialService', () => {
	describe('access recheck', () => {
		it('resolves a credential the user may use', async () => {
			const { service, credentialsFinderService, credentialsService } = createService();
			credentialsFinderService.findCredentialForUser.mockResolvedValue(staticCredential);
			credentialsService.decrypt.mockResolvedValue({ apiKey: 'secret-key' });

			const result = await service.resolveForOneOffTask({
				credentialId: 'cred-static',
				userId: 'user-1',
			});

			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				'cred-static',
				fakeUser,
				['credential:read'],
			);
			expect(result.envVars).toEqual({ N8N_TASK_MY_API_KEY_API_KEY: 'secret-key' });
		});

		it('throws UserError when the credential does not exist', async () => {
			const { service, credentialsFinderService, credentialsService } = createService();
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			await expect(
				service.resolveForOneOffTask({ credentialId: 'cred-static', userId: 'user-1' }),
			).rejects.toThrow(UserError);
			expect(credentialsService.decrypt).not.toHaveBeenCalled();
		});

		it('throws UserError when the credential is not usable in the given project', async () => {
			const { service, credentialsFinderService, credentialsService } = createService();
			credentialsFinderService.findCredentialForUser.mockResolvedValue(staticCredential);

			await expect(
				service.resolveForOneOffTask({
					credentialId: 'cred-static',
					userId: 'user-1',
					projectId: 'other-project',
				}),
			).rejects.toThrow(UserError);
			expect(credentialsService.decrypt).not.toHaveBeenCalled();
		});

		it('throws UserError when the user does not exist', async () => {
			const { service, userRepository, credentialsFinderService } = createService();
			userRepository.findOne.mockResolvedValue(null);

			await expect(
				service.resolveForOneOffTask({ credentialId: 'cred-static', userId: 'ghost' }),
			).rejects.toThrow(UserError);
			expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
		});

		it('uses one message for "missing" and "forbidden" so denial never leaks existence', async () => {
			const { service, credentialsFinderService } = createService();

			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(null);
			const missingError = await service
				.resolveForOneOffTask({ credentialId: 'cred-static', userId: 'user-1' })
				.then(
					() => null,
					(error: Error) => error,
				);

			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(staticCredential);
			const forbiddenError = await service
				.resolveForOneOffTask({
					credentialId: 'cred-static',
					userId: 'user-1',
					projectId: 'other-project',
				})
				.then(
					() => null,
					(error: Error) => error,
				);

			expect(missingError).toBeInstanceOf(UserError);
			expect(forbiddenError).toBeInstanceOf(UserError);
			expect(forbiddenError?.message).toBe(missingError?.message);
		});

		it('allows a global credential in any project scope', async () => {
			const { service, credentialsFinderService, credentialsService } = createService();
			const globalCredential = mock<CredentialsEntity>({
				id: 'cred-global',
				name: 'Global key',
				type: 'acmeApi',
				isGlobal: true,
				shared: [],
			});
			credentialsFinderService.findCredentialForUser.mockResolvedValue(globalCredential);
			credentialsService.decrypt.mockResolvedValue({ apiKey: 'global-secret' });

			const result = await service.resolveForOneOffTask({
				credentialId: 'cred-global',
				userId: 'user-1',
				projectId: 'any-project',
			});

			expect(result.envVars).toEqual({ N8N_TASK_GLOBAL_KEY_API_KEY: 'global-secret' });
		});
	});

	describe('static credentials', () => {
		it('maps each injectable field via credentialEnvVarName, skipping empty and expression values', async () => {
			const { service, credentialsFinderService, credentialsService } = createService();
			credentialsFinderService.findCredentialForUser.mockResolvedValue(staticCredential);
			credentialsService.decrypt.mockResolvedValue({
				apiKey: 'secret-key',
				baseUrl: 'https://api.acme.test',
				port: 8080,
				secure: true,
				emptyField: '',
				expressionField: '={{ $json.apiKey }}',
				nested: { not: 'injectable' },
			});

			const result = await service.resolveForOneOffTask({
				credentialId: 'cred-static',
				userId: 'user-1',
				projectId: 'project-1',
			});

			expect(result).toEqual({
				envVars: {
					[credentialEnvVarName('My Api Key', 'apiKey')]: 'secret-key',
					[credentialEnvVarName('My Api Key', 'baseUrl')]: 'https://api.acme.test',
					[credentialEnvVarName('My Api Key', 'port')]: '8080',
					[credentialEnvVarName('My Api Key', 'secure')]: 'true',
				},
			});
			expect(result.expiresAt).toBeUndefined();
			expect(credentialsService.decrypt).toHaveBeenCalledWith(staticCredential, true);
		});
	});

	describe('OAuth2 credentials', () => {
		const staleData = {
			clientId: 'client-id',
			clientSecret: 'client-secret',
			oauthTokenData: { access_token: 'stale-token', refresh_token: 'refresh-token' },
		};
		const freshData = {
			clientId: 'client-id',
			clientSecret: 'client-secret',
			oauthTokenData: {
				access_token: 'fresh-token',
				refresh_token: 'refresh-token',
				expires_in: 3600,
			},
		};

		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		function arrangeOAuth(overrides?: { credential?: CredentialsEntity }) {
			const context = createService();
			const credential = overrides?.credential ?? oauthCredential;
			context.credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			context.credentialsFinderService.findCredentialById.mockResolvedValue(credential);
			context.credentialsService.decrypt
				.mockResolvedValueOnce(staleData)
				.mockResolvedValueOnce(freshData);
			context.oauthService.refreshOAuth2CredentialById.mockResolvedValue({
				Authorization: 'Bearer fresh-token',
			});
			return { ...context, credential };
		}

		it('refreshes first, then returns only the fresh access token and expiry', async () => {
			const { service, credentialsService, oauthService } = arrangeOAuth();

			const result = await service.resolveForOneOffTask({
				credentialId: 'cred-oauth',
				userId: 'user-1',
				projectId: 'project-1',
			});

			expect(oauthService.refreshOAuth2CredentialById).toHaveBeenCalledWith(
				'cred-oauth',
				'project-1',
			);
			// The refresh must run before the decrypt that produces the injected token.
			const refreshOrder = oauthService.refreshOAuth2CredentialById.mock.invocationCallOrder[0];
			const freshDecryptOrder = credentialsService.decrypt.mock.invocationCallOrder[1];
			expect(refreshOrder).toBeLessThan(freshDecryptOrder);

			expect(result).toEqual({
				envVars: {
					[credentialEnvVarName('Google Sheets account', 'access_token')]: 'fresh-token',
				},
				expiresAt: '2026-01-01T01:00:00.000Z',
			});
		});

		it('never includes the refresh token, client secret, or client id in envVars', async () => {
			const { service } = arrangeOAuth();

			const result = await service.resolveForOneOffTask({
				credentialId: 'cred-oauth',
				userId: 'user-1',
			});

			expect(Object.keys(result.envVars)).toEqual([
				credentialEnvVarName('Google Sheets account', 'access_token'),
			]);
			const values = Object.values(result.envVars);
			expect(values).not.toContain('refresh-token');
			expect(values).not.toContain('client-secret');
			expect(values).not.toContain('client-id');
		});

		it('falls back to the owning project for the refresh when no project is given', async () => {
			const { service, oauthService } = arrangeOAuth();

			await service.resolveForOneOffTask({ credentialId: 'cred-oauth', userId: 'user-1' });

			expect(oauthService.refreshOAuth2CredentialById).toHaveBeenCalledWith(
				'cred-oauth',
				'project-1',
			);
		});

		it('detects OAuth2 through the extends chain, not only the type name suffix', async () => {
			const { service, loadNodesAndCredentials, oauthService } = arrangeOAuth({
				credential: mock<CredentialsEntity>({
					id: 'cred-oauth',
					name: 'Chained OAuth',
					type: 'acmeChainedAuth',
					isGlobal: false,
					shared: [{ projectId: 'project-1', role: 'credential:owner' }],
				}),
			});
			setKnownCredentials(loadNodesAndCredentials, {
				acmeChainedAuth: { className: 'AcmeChainedAuth', sourcePath: '', extends: ['acmeBase'] },
				acmeBase: { className: 'AcmeBase', sourcePath: '', extends: ['oAuth2Api'] },
			});

			const result = await service.resolveForOneOffTask({
				credentialId: 'cred-oauth',
				userId: 'user-1',
			});

			expect(oauthService.refreshOAuth2CredentialById).toHaveBeenCalled();
			expect(result.envVars).toEqual({
				[credentialEnvVarName('Chained OAuth', 'access_token')]: 'fresh-token',
			});
		});

		it('throws UserError when the credential was never connected', async () => {
			const { service, credentialsFinderService, credentialsService, oauthService } =
				createService();
			credentialsFinderService.findCredentialForUser.mockResolvedValue(oauthCredential);
			credentialsService.decrypt.mockResolvedValue({ clientId: 'client-id' });

			await expect(
				service.resolveForOneOffTask({ credentialId: 'cred-oauth', userId: 'user-1' }),
			).rejects.toThrow(UserError);
			expect(oauthService.refreshOAuth2CredentialById).not.toHaveBeenCalled();
		});

		it('throws OperationalError when the refresh fails', async () => {
			const { service, credentialsFinderService, credentialsService, oauthService } =
				createService();
			credentialsFinderService.findCredentialForUser.mockResolvedValue(oauthCredential);
			credentialsService.decrypt.mockResolvedValue(staleData);
			oauthService.refreshOAuth2CredentialById.mockResolvedValue(null);

			await expect(
				service.resolveForOneOffTask({ credentialId: 'cred-oauth', userId: 'user-1' }),
			).rejects.toThrow(OperationalError);
		});
	});

	describe('output schema', () => {
		it('returns values that validate against resolvedCredentialEnvSchema (static)', async () => {
			const { service, credentialsFinderService, credentialsService } = createService();
			credentialsFinderService.findCredentialForUser.mockResolvedValue(staticCredential);
			credentialsService.decrypt.mockResolvedValue({ apiKey: 'secret-key' });

			const result = await service.resolveForOneOffTask({
				credentialId: 'cred-static',
				userId: 'user-1',
			});

			const parsed = resolvedCredentialEnvSchema.safeParse(result);
			expect(parsed.success).toBe(true);
			expect(Object.keys(result).sort()).toEqual(['envVars']);
		});

		it('returns values that validate against resolvedCredentialEnvSchema (OAuth)', async () => {
			const { service, credentialsFinderService, credentialsService, oauthService } =
				createService();
			credentialsFinderService.findCredentialForUser.mockResolvedValue(oauthCredential);
			credentialsFinderService.findCredentialById.mockResolvedValue(oauthCredential);
			credentialsService.decrypt
				.mockResolvedValueOnce({ oauthTokenData: { access_token: 'stale' } })
				.mockResolvedValueOnce({
					oauthTokenData: { access_token: 'fresh-token', expires_in: '1800' },
				});
			oauthService.refreshOAuth2CredentialById.mockResolvedValue({
				Authorization: 'Bearer fresh-token',
			});

			const result = await service.resolveForOneOffTask({
				credentialId: 'cred-oauth',
				userId: 'user-1',
			});

			const parsed = resolvedCredentialEnvSchema.safeParse(result);
			expect(parsed.success).toBe(true);
			expect(Object.keys(result).sort()).toEqual(['envVars', 'expiresAt']);
			expect(typeof result.expiresAt).toBe('string');
			expect(Number.isNaN(Date.parse(result.expiresAt as string))).toBe(false);
		});
	});

	describe('credentialEnvVarName convention', () => {
		it('produces N8N_TASK_<CREDENTIAL>_<FIELD> in upper snake case', () => {
			expect(credentialEnvVarName('Google Sheets account', 'access_token')).toBe(
				'N8N_TASK_GOOGLE_SHEETS_ACCOUNT_ACCESS_TOKEN',
			);
			expect(credentialEnvVarName('My Api Key', 'apiKey')).toBe('N8N_TASK_MY_API_KEY_API_KEY');
			expect(credentialEnvVarName('weird -- name!', 'x')).toBe('N8N_TASK_WEIRD_NAME_X');
		});
	});
});
