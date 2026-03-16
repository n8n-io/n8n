import { mockLogger } from '@n8n/backend-test-utils';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { type Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import {
	BrokerAlreadyRegisteredError,
	BrokerClientService,
	BrokerError,
	BrokerRefreshRejectedError,
	BrokerTokenExpiredError,
	BrokerTokenNotReadyError,
	BrokerUnavailableError,
} from '../broker-client.service';

const BROKER_URL = 'https://broker.example.com';

function mockFetch(status: number, body?: unknown): jest.Mock {
	return jest.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	});
}

describe('BrokerClientService', () => {
	const settingsRepository = mockInstance(SettingsRepository);
	const logger = mockLogger();
	// The scoped logger that BrokerClientService actually logs through
	let scopedLogger: Logger;
	let service: BrokerClientService;

	beforeEach(() => {
		jest.restoreAllMocks();
		settingsRepository.findByKey.mockReset();
		settingsRepository.upsert.mockReset();
		settingsRepository.delete.mockReset();
		// restoreAllMocks clears mockReturnValue — re-configure scoped so the constructor gets a valid Logger
		scopedLogger = mock<Logger>();
		(logger.scoped as jest.Mock).mockReturnValue(scopedLogger);
		const globalConfig = mock<GlobalConfig>({ brokerAuth: { url: BROKER_URL, enabled: true } });
		service = new BrokerClientService(logger, settingsRepository, globalConfig);
	});

	// ---------------------------------------------------------------------------

	describe('ensureRegistered', () => {
		it('returns early when API key already exists in DB', async () => {
			settingsRepository.findByKey.mockResolvedValue(mock<Settings>({ value: 'existing-api-key' }));
			global.fetch = jest.fn();

			await service.ensureRegistered('inst-1', 'https://n8n.example.com', 'consumer-1');

			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('calls registerInstance when no API key in DB', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);
			global.fetch = mockFetch(200, { apiKey: 'new-key' });

			await service.ensureRegistered('inst-1', 'https://n8n.example.com', 'consumer-1');

			expect(global.fetch).toHaveBeenCalledWith(
				`${BROKER_URL}/keys/register`,
				expect.objectContaining({ method: 'POST' }),
			);
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({ value: 'new-key' }),
				['key'],
			);
		});

		it('logs a warning and returns when broker returns 409 (already registered)', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);
			global.fetch = mockFetch(409);

			await service.ensureRegistered('inst-1', 'https://n8n.example.com', 'consumer-1');

			expect(scopedLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already registered'));
			expect(settingsRepository.upsert).not.toHaveBeenCalled();
		});

		it('propagates unexpected errors from registerInstance', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);
			global.fetch = mockFetch(500);

			await expect(
				service.ensureRegistered('inst-1', 'https://n8n.example.com', 'consumer-1'),
			).rejects.toThrow(BrokerError);
		});

		it('returns early (no-op) when broker URL is not configured', async () => {
			const noUrlConfig = mock<GlobalConfig>({ brokerAuth: { url: '', enabled: true } });
			const noUrlService = new BrokerClientService(logger, settingsRepository, noUrlConfig);
			global.fetch = jest.fn();

			await noUrlService.ensureRegistered('inst-1', 'https://n8n.example.com', 'consumer-1');

			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('returns early (no-op) when broker auth is disabled', async () => {
			const disabledConfig = mock<GlobalConfig>({
				brokerAuth: { url: BROKER_URL, enabled: false },
			});
			const disabledService = new BrokerClientService(logger, settingsRepository, disabledConfig);
			global.fetch = jest.fn();

			await disabledService.ensureRegistered('inst-1', 'https://n8n.example.com', 'consumer-1');

			expect(global.fetch).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------------------

	describe('registerInstance', () => {
		it('POSTs to /keys/register with X-Instance-Hash, saves returned apiKey', async () => {
			global.fetch = mockFetch(200, { apiKey: 'mob_abc123' });

			const result = await service.registerInstance(
				'inst-1',
				'https://n8n.example.com',
				'consumer-1',
			);

			expect(result).toBe('mob_abc123');
			const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
			expect(url).toBe(`${BROKER_URL}/keys/register`);
			expect((init.headers as Record<string, string>)['X-Instance-Hash']).toMatch(/^[a-f0-9]{64}$/);
			expect(init.method).toBe('POST');
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{ key: 'brokerApiKey', value: 'mob_abc123', loadOnStartup: false },
				['key'],
			);
		});

		it('derives a consistent X-Instance-Hash for the same inputs', async () => {
			global.fetch = mockFetch(200, { apiKey: 'k' });
			await service.registerInstance('id-A', 'https://example.com', 'cid-B');
			const firstHash = ((global.fetch as jest.Mock).mock.calls[0][1] as RequestInit)
				.headers as Record<string, string>;

			global.fetch = mockFetch(200, { apiKey: 'k' });
			await service.registerInstance('id-A', 'https://example.com', 'cid-B');
			const secondHash = ((global.fetch as jest.Mock).mock.calls[0][1] as RequestInit)
				.headers as Record<string, string>;

			expect(firstHash['X-Instance-Hash']).toBe(secondHash['X-Instance-Hash']);
		});

		it('throws BrokerError on 401', async () => {
			global.fetch = mockFetch(401);
			await expect(
				service.registerInstance('inst-1', 'https://n8n.example.com', 'consumer-1'),
			).rejects.toThrow('registration hash is invalid');
		});

		it('throws BrokerAlreadyRegisteredError on 409', async () => {
			global.fetch = mockFetch(409);
			await expect(
				service.registerInstance('inst-1', 'https://n8n.example.com', 'consumer-1'),
			).rejects.toBeInstanceOf(BrokerAlreadyRegisteredError);
		});

		it('throws BrokerError with status on other non-ok responses', async () => {
			global.fetch = mockFetch(500);
			await expect(
				service.registerInstance('inst-1', 'https://n8n.example.com', 'consumer-1'),
			).rejects.toThrow('status 500');
		});

		it('throws BrokerError when N8N_OAUTH_BROKER_URL is not configured', async () => {
			const noUrlConfig = mock<GlobalConfig>({ brokerAuth: { url: '', enabled: true } });
			const noUrlService = new BrokerClientService(logger, settingsRepository, noUrlConfig);

			await expect(
				noUrlService.registerInstance('inst-1', 'https://n8n.example.com', 'consumer-1'),
			).rejects.toThrow('N8N_OAUTH_BROKER_URL is not configured');
		});
	});

	// ---------------------------------------------------------------------------

	describe('startFlow', () => {
		beforeEach(() => {
			settingsRepository.findByKey.mockResolvedValue(mock<Settings>({ value: 'test-api-key' }));
		});

		it('POSTs to /flow/start with Bearer auth and returns authUrl', async () => {
			global.fetch = mockFetch(200, { authUrl: 'https://accounts.google.com/o/oauth2/auth?...' });

			const result = await service.startFlow({
				provider: 'google',
				flowId: 'uuid-flow-1',
				instanceBaseUrl: 'https://n8n.example.com',
			});

			expect(result).toBe('https://accounts.google.com/o/oauth2/auth?...');
			const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
			expect(url).toBe(`${BROKER_URL}/flow/start`);
			expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-api-key');
		});

		it('includes scopes and authQueryParameters in the request body when provided', async () => {
			global.fetch = mockFetch(200, { authUrl: 'https://accounts.google.com/...' });

			await service.startFlow({
				provider: 'gmailBrokerOAuth2Api',
				flowId: 'uuid-flow-2',
				instanceBaseUrl: 'https://n8n.example.com',
				scopes: ['https://mail.google.com/', 'https://www.googleapis.com/auth/gmail.modify'],
				authQueryParameters: { access_type: 'offline', prompt: 'consent' },
			});

			const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
			expect(JSON.parse(init.body as string)).toEqual({
				provider: 'gmailBrokerOAuth2Api',
				flowId: 'uuid-flow-2',
				instanceBaseUrl: 'https://n8n.example.com',
				scopes: ['https://mail.google.com/', 'https://www.googleapis.com/auth/gmail.modify'],
				authQueryParameters: { access_type: 'offline', prompt: 'consent' },
			});
		});

		it('throws BrokerError when no API key is in DB', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);
			await expect(
				service.startFlow({
					provider: 'google',
					flowId: 'f1',
					instanceBaseUrl: 'https://n8n.example.com',
				}),
			).rejects.toThrow('Broker API key not found');
		});

		it('throws BrokerError on non-ok response', async () => {
			global.fetch = mockFetch(503);
			await expect(
				service.startFlow({
					provider: 'google',
					flowId: 'f1',
					instanceBaseUrl: 'https://n8n.example.com',
				}),
			).rejects.toThrow('status 503');
		});

		it('throws BrokerError when N8N_OAUTH_BROKER_URL is not configured', async () => {
			const noUrlConfig = mock<GlobalConfig>({ brokerAuth: { url: '', enabled: true } });
			const noUrlService = new BrokerClientService(logger, settingsRepository, noUrlConfig);
			// Need the API key lookup to succeed so it reaches getBrokerUrl()
			settingsRepository.findByKey.mockResolvedValue(mock<Settings>({ value: 'test-api-key' }));

			await expect(
				noUrlService.startFlow({
					provider: 'google',
					flowId: 'f1',
					instanceBaseUrl: 'https://n8n.example.com',
				}),
			).rejects.toThrow('N8N_OAUTH_BROKER_URL is not configured');
		});
	});

	// ---------------------------------------------------------------------------

	describe('retrieveTokens', () => {
		beforeEach(() => {
			settingsRepository.findByKey.mockResolvedValue(mock<Settings>({ value: 'test-api-key' }));
		});

		it('GETs /tokens/:code with Bearer auth and returns TokenSet', async () => {
			const tokenSet = { access_token: 'at_abc', refresh_token: 'rt_xyz' };
			global.fetch = mockFetch(200, tokenSet);

			const result = await service.retrieveTokens('retrieval-code-1');

			expect(result).toEqual(tokenSet);
			const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
			expect(url).toBe(`${BROKER_URL}/tokens/retrieval-code-1`);
			expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-api-key');
		});

		it('URL-encodes the retrieval code', async () => {
			global.fetch = mockFetch(200, { access_token: 'at' });

			await service.retrieveTokens('code with spaces/and+special');

			const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
			expect(url).toBe(`${BROKER_URL}/tokens/code%20with%20spaces%2Fand%2Bspecial`);
		});

		it('throws BrokerError on 401', async () => {
			global.fetch = mockFetch(401);
			await expect(service.retrieveTokens('code')).rejects.toThrow('API key is missing or invalid');
		});

		it('throws BrokerTokenNotReadyError on 404', async () => {
			global.fetch = mockFetch(404);
			await expect(service.retrieveTokens('code')).rejects.toBeInstanceOf(BrokerTokenNotReadyError);
		});

		it('throws BrokerTokenExpiredError on 410', async () => {
			global.fetch = mockFetch(410);
			await expect(service.retrieveTokens('code')).rejects.toBeInstanceOf(BrokerTokenExpiredError);
		});

		it('throws BrokerError with status on other non-ok responses', async () => {
			global.fetch = mockFetch(503);
			await expect(service.retrieveTokens('code')).rejects.toThrow('status 503');
		});
	});

	// ---------------------------------------------------------------------------

	describe('refreshToken', () => {
		beforeEach(() => {
			settingsRepository.findByKey.mockResolvedValue(mock<Settings>({ value: 'test-api-key' }));
		});

		it('POSTs to /token/refresh with Bearer auth and returns new TokenSet', async () => {
			const tokenSet = { access_token: 'new_at', refresh_token: 'new_rt' };
			global.fetch = mockFetch(200, tokenSet);

			const result = await service.refreshToken({
				provider: 'google',
				refreshToken: 'old_rt',
			});

			expect(result).toEqual(tokenSet);
			const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
			expect(url).toBe(`${BROKER_URL}/token/refresh`);
			expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-api-key');
			expect(JSON.parse(init.body as string)).toEqual({
				provider: 'google',
				refreshToken: 'old_rt',
			});
		});

		it('includes scopes in the request body when provided', async () => {
			const tokenSet = { access_token: 'new_at', refresh_token: 'new_rt' };
			global.fetch = mockFetch(200, tokenSet);

			await service.refreshToken({
				provider: 'gmailBrokerOAuth2Api',
				refreshToken: 'old_rt',
				scopes: ['https://mail.google.com/', 'https://www.googleapis.com/auth/gmail.modify'],
			});

			const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
			expect(JSON.parse(init.body as string)).toEqual({
				provider: 'gmailBrokerOAuth2Api',
				refreshToken: 'old_rt',
				scopes: ['https://mail.google.com/', 'https://www.googleapis.com/auth/gmail.modify'],
			});
		});

		it('throws BrokerRefreshRejectedError on 401', async () => {
			global.fetch = mockFetch(401);
			await expect(
				service.refreshToken({ provider: 'google', refreshToken: 'rt' }),
			).rejects.toBeInstanceOf(BrokerRefreshRejectedError);
		});

		it('throws BrokerUnavailableError on 502', async () => {
			global.fetch = mockFetch(502);
			await expect(
				service.refreshToken({ provider: 'google', refreshToken: 'rt' }),
			).rejects.toBeInstanceOf(BrokerUnavailableError);
		});

		it('throws BrokerError with status on other non-ok responses', async () => {
			global.fetch = mockFetch(429);
			await expect(
				service.refreshToken({ provider: 'google', refreshToken: 'rt' }),
			).rejects.toThrow('status 429');
		});
	});
});
