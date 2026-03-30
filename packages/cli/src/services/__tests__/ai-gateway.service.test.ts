import type { GlobalConfig } from '@n8n/config';
import type { LicenseState, Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';

import { N8N_VERSION, AI_ASSISTANT_SDK_VERSION } from '@/constants';
import type { License } from '@/license';
import { AiGatewayService } from '@/services/ai-gateway.service';

const BASE_URL = 'http://gateway.test';
const INSTANCE_ID = 'test-instance-id';
const USER_ID = 'user-abc';
const LICENSE_CERT = 'cert-xyz';
const CONSUMER_ID = 'consumer-test-uuid';

function makeService(baseUrl: string | null = BASE_URL) {
	const globalConfig = {
		aiAssistant: { baseUrl: baseUrl ?? undefined },
	} as unknown as GlobalConfig;
	const license = mock<License>({
		loadCertStr: jest.fn().mockResolvedValue(LICENSE_CERT),
		getConsumerId: jest.fn().mockReturnValue(CONSUMER_ID),
	});
	const licenseState = mock<LicenseState>({ isAiCreditsLicensed: jest.fn().mockReturnValue(true) });
	const instanceSettings = mock<InstanceSettings>({ instanceId: INSTANCE_ID });
	const logger = mock<Logger>();
	return new AiGatewayService(globalConfig, license, licenseState, instanceSettings, logger);
}

describe('AiGatewayService', () => {
	let fetchMock: jest.Mock;

	beforeEach(() => {
		fetchMock = jest.fn();
		global.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getSyntheticCredential()', () => {
		it('throws UserError when baseUrl is not configured', async () => {
			const service = makeService(null);
			await expect(service.getSyntheticCredential('googlePalmApi', USER_ID)).rejects.toThrow(
				UserError,
			);
		});

		it('throws UserError for unsupported credential type', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ token: 'mock-jwt', expiresIn: 3600 }),
			});
			const service = makeService();
			await expect(service.getSyntheticCredential('openAiApi', USER_ID)).rejects.toThrow(UserError);
		});

		it('returns synthetic credential with apiKey (JWT) and host (gateway URL)', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ token: 'mock-jwt-token', expiresIn: 3600 }),
			});
			const service = makeService();

			const result = await service.getSyntheticCredential('googlePalmApi', USER_ID);

			expect(result).toEqual({
				apiKey: 'mock-jwt-token',
				host: `${BASE_URL}/v1/gateway/google`,
			});
		});

		it('fetches token from gateway with HeadersMetadataDto headers and licenseCert body', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ token: 'mock-jwt-token', expiresIn: 3600 }),
			});
			const service = makeService();

			await service.getSyntheticCredential('googlePalmApi', USER_ID);

			expect(fetchMock).toHaveBeenCalledWith(
				`${BASE_URL}/v1/gateway/credentials`,
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-user-id': USER_ID,
						'x-consumer-id': CONSUMER_ID,
						'x-sdk-version': AI_ASSISTANT_SDK_VERSION,
						'x-n8n-version': N8N_VERSION,
						'x-instance-id': INSTANCE_ID,
					},
					body: JSON.stringify({ licenseCert: LICENSE_CERT }),
				}),
			);
		});

		it('caches the token and reuses it on subsequent calls', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ token: 'cached-token', expiresIn: 3600 }),
			});
			const service = makeService();

			await service.getSyntheticCredential('googlePalmApi', USER_ID);
			await service.getSyntheticCredential('googlePalmApi', USER_ID);

			// Token endpoint called only once; second call uses cache
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		it('throws UserError when gateway returns non-ok status', async () => {
			fetchMock.mockResolvedValue({ ok: false, status: 503 });
			const service = makeService();
			await expect(service.getSyntheticCredential('googlePalmApi', USER_ID)).rejects.toThrow(
				UserError,
			);
		});

		it('throws UserError when gateway token response is missing token field', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ expiresIn: 3600 }), // token missing
			});
			const service = makeService();
			await expect(service.getSyntheticCredential('googlePalmApi', USER_ID)).rejects.toThrow(
				UserError,
			);
		});
	});

	describe('getCreditsRemaining()', () => {
		it('throws UserError when baseUrl is not configured', async () => {
			const service = makeService(null);
			await expect(service.getCreditsRemaining(USER_ID)).rejects.toThrow(UserError);
		});

		it('returns creditsQuota and creditsRemaining from gateway', async () => {
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ token: 'mock-jwt', expiresIn: 3600 }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ creditsQuota: 10, creditsRemaining: 7 }),
				});
			const service = makeService();

			const result = await service.getCreditsRemaining(USER_ID);

			expect(result).toEqual({ creditsQuota: 10, creditsRemaining: 7 });
		});

		it('sends JWT Bearer token in Authorization header to credits endpoint', async () => {
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ token: 'mock-jwt', expiresIn: 3600 }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ creditsQuota: 10, creditsRemaining: 7 }),
				});
			const service = makeService();

			await service.getCreditsRemaining(USER_ID);

			expect(fetchMock).toHaveBeenNthCalledWith(
				1,
				`${BASE_URL}/v1/gateway/credentials`,
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ licenseCert: LICENSE_CERT }),
				}),
			);
			expect(fetchMock).toHaveBeenNthCalledWith(2, `${BASE_URL}/v1/gateway/credits`, {
				method: 'GET',
				headers: { Authorization: 'Bearer mock-jwt' },
			});
		});

		it('throws UserError when credits gateway returns non-ok status', async () => {
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ token: 'mock-jwt', expiresIn: 3600 }),
				})
				.mockResolvedValueOnce({ ok: false, status: 429 });
			const service = makeService();
			await expect(service.getCreditsRemaining(USER_ID)).rejects.toThrow(UserError);
		});

		it('throws UserError when gateway returns invalid response shape', async () => {
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ token: 'mock-jwt', expiresIn: 3600 }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ creditsQuota: 'not-a-number' }),
				});
			const service = makeService();
			await expect(service.getCreditsRemaining(USER_ID)).rejects.toThrow(UserError);
		});
	});
});
