import type { Logger } from '@n8n/backend-common';
import type { CredentialsEntity, User } from '@n8n/db';
import { OperationalError } from 'n8n-workflow';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { OauthService } from '@/oauth/oauth.service';

import { OneOffTaskCredentialEnvService } from '../one-off-task-credential-env.service';

const user = { id: 'user-1' } as User;

function credentialEntity(overrides: Partial<CredentialsEntity> = {}): CredentialsEntity {
	return {
		id: 'cred-1',
		name: 'My Credential',
		type: 'airtableApi',
		shared: [{ projectId: 'project-1' }],
		...overrides,
	} as CredentialsEntity;
}

function createService({
	credential = credentialEntity(),
	decrypted = [{ apiKey: 'secret-key' }],
	refreshResult = null,
}: {
	credential?: CredentialsEntity | null;
	decrypted?: Array<Record<string, unknown>>;
	refreshResult?: { Authorization: string } | null;
} = {}) {
	const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };
	const finder = {
		findCredentialForUser: vi.fn().mockResolvedValue(credential),
	};
	const decrypt = vi.fn();
	for (const data of decrypted) decrypt.mockResolvedValueOnce(data);
	decrypt.mockResolvedValue(decrypted[decrypted.length - 1]);
	const credentialsService = { decrypt };
	const oauthService = {
		refreshOAuth2CredentialById: vi.fn().mockResolvedValue(refreshResult),
	};

	const service = new OneOffTaskCredentialEnvService(
		logger as unknown as Logger,
		finder as unknown as CredentialsFinderService,
		credentialsService as unknown as CredentialsService,
		oauthService as unknown as OauthService,
	);

	return { service, logger, finder, decrypt, oauthService };
}

describe('OneOffTaskCredentialEnvService', () => {
	it('throws when the credential is not accessible to the user and never decrypts', async () => {
		const { service, decrypt } = createService({ credential: null });

		await expect(service.resolve(user, ['cred-1'])).rejects.toThrow(OperationalError);
		expect(decrypt).not.toHaveBeenCalled();
	});

	it('checks user access with credential:read before anything else', async () => {
		const { service, finder } = createService();

		await service.resolve(user, ['cred-1']);

		expect(finder.findCredentialForUser).toHaveBeenCalledWith('cred-1', user, ['credential:read']);
	});

	it('throws when decryption yields an empty object', async () => {
		const { service } = createService({ decrypted: [{}] });

		await expect(service.resolve(user, ['cred-1'])).rejects.toThrow('could not be decrypted');
	});

	it('maps static string fields to prefixed env vars and skips non-string fields', async () => {
		const { service } = createService({
			decrypted: [{ apiKey: 'secret-key', url: 'https://api.airtable.com', retries: 3 }],
		});

		const resolved = await service.resolve(user, ['cred-1']);

		expect(resolved.env).toEqual({
			AIRTABLE_API_KEY: 'secret-key',
			AIRTABLE_URL: 'https://api.airtable.com',
		});
		expect(resolved.credentials).toEqual([
			{
				id: 'cred-1',
				name: 'My Credential',
				type: 'airtableApi',
				envVarNames: ['AIRTABLE_API_KEY', 'AIRTABLE_URL'],
			},
		]);
	});

	it('throws when a static credential has no injectable string fields', async () => {
		const { service } = createService({ decrypted: [{ retries: 3 }] });

		await expect(service.resolve(user, ['cred-1'])).rejects.toThrow('no fields');
	});

	it('refreshes OAuth credentials and injects only the fresh access token', async () => {
		const { service, finder, oauthService } = createService({
			credential: credentialEntity({ id: 'cred-oauth', type: 'googleSheetsOAuth2Api' }),
			decrypted: [
				{
					clientId: 'client-id',
					clientSecret: 'client-secret',
					oauthTokenData: { access_token: 'stale', refresh_token: 'refresh-secret' },
				},
				{
					clientId: 'client-id',
					clientSecret: 'client-secret',
					oauthTokenData: { access_token: 'fresh', refresh_token: 'refresh-secret' },
				},
			],
			refreshResult: { Authorization: 'Bearer fresh' },
		});

		const resolved = await service.resolve(user, ['cred-oauth']);

		expect(oauthService.refreshOAuth2CredentialById).toHaveBeenCalledWith(
			'cred-oauth',
			'project-1',
		);
		// User-scoped access check precedes the project-authorized refresh.
		expect(finder.findCredentialForUser.mock.invocationCallOrder[0]).toBeLessThan(
			oauthService.refreshOAuth2CredentialById.mock.invocationCallOrder[0],
		);
		expect(resolved.env).toEqual({ GOOGLE_SHEETS_ACCESS_TOKEN: 'fresh' });
		expect(Object.values(resolved.env)).not.toContain('refresh-secret');
		expect(Object.values(resolved.env)).not.toContain('client-secret');
		expect(resolved.credentials[0].envVarNames).toEqual(['GOOGLE_SHEETS_ACCESS_TOKEN']);
	});

	it('uses the stored token without refreshing when the credential has no project', async () => {
		const { service, logger, oauthService } = createService({
			credential: credentialEntity({ type: 'googleSheetsOAuth2Api', shared: [] }),
			decrypted: [{ oauthTokenData: { accessToken: 'stored' } }],
		});

		const resolved = await service.resolve(user, ['cred-1']);

		expect(oauthService.refreshOAuth2CredentialById).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalled();
		expect(resolved.env).toEqual({ GOOGLE_SHEETS_ACCESS_TOKEN: 'stored' });
	});

	it('falls back to the stored token when the refresh fails', async () => {
		const { service, logger } = createService({
			credential: credentialEntity({ type: 'googleSheetsOAuth2Api' }),
			decrypted: [{ oauthTokenData: { access_token: 'stored' } }],
			refreshResult: null,
		});

		const resolved = await service.resolve(user, ['cred-1']);

		expect(logger.warn).toHaveBeenCalled();
		expect(resolved.env).toEqual({ GOOGLE_SHEETS_ACCESS_TOKEN: 'stored' });
	});

	it('throws when an OAuth credential has no access token', async () => {
		const { service } = createService({
			credential: credentialEntity({ type: 'googleSheetsOAuth2Api', shared: [] }),
			decrypted: [{ oauthTokenData: { token_type: 'Bearer' } }],
		});

		await expect(service.resolve(user, ['cred-1'])).rejects.toThrow('no OAuth access token');
	});

	it('merges env vars across multiple credentials', async () => {
		const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };
		const credentials: Record<string, CredentialsEntity> = {
			'cred-a': credentialEntity({ id: 'cred-a', name: 'Airtable', type: 'airtableApi' }),
			'cred-b': credentialEntity({ id: 'cred-b', name: 'Slack', type: 'slackApi' }),
		};
		const finder = {
			findCredentialForUser: vi.fn(
				async (credentialId: string) => credentials[credentialId] ?? null,
			),
		};
		const credentialsService = {
			decrypt: vi.fn(async (credential: CredentialsEntity) =>
				credential.id === 'cred-a' ? { apiKey: 'airtable-key' } : { accessToken: 'slack-token' },
			),
		};
		const oauthService = { refreshOAuth2CredentialById: vi.fn() };

		const service = new OneOffTaskCredentialEnvService(
			logger as unknown as Logger,
			finder as unknown as CredentialsFinderService,
			credentialsService as unknown as CredentialsService,
			oauthService as unknown as OauthService,
		);

		const resolved = await service.resolve(user, ['cred-a', 'cred-b']);

		expect(resolved.env).toEqual({
			AIRTABLE_API_KEY: 'airtable-key',
			SLACK_ACCESS_TOKEN: 'slack-token',
		});
		expect(resolved.credentials.map((credential) => credential.id)).toEqual(['cred-a', 'cred-b']);
	});
});
