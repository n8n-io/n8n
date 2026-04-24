import type { GlobalConfig } from '@n8n/config';
import type { LicenseState } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';

import { N8N_VERSION, AI_ASSISTANT_SDK_VERSION } from '@/constants';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import type { License } from '@/license';
import { AiGatewayService } from '@/services/ai-gateway.service';
import type { Project, User, UserRepository } from '@n8n/db';
import type { OwnershipService } from '@/services/ownership.service';
import type { UrlService } from '@/services/url.service';

const INSTANCE_BASE_URL = 'https://my-n8n.example.com';

const BASE_URL = 'http://gateway.test';
const INSTANCE_ID = 'test-instance-id';
const USER_ID = 'user-abc';
const LICENSE_CERT = 'cert-xyz';
const CONSUMER_ID = 'consumer-test-uuid';

const MOCK_GATEWAY_CONFIG = {
	nodes: [
		'@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
		'@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
		'@n8n/n8n-nodes-langchain.googleGemini',
	],
	credentialTypes: ['googlePalmApi'],
	providerConfig: {
		googlePalmApi: { gatewayPath: '/v1/gateway/google', urlField: 'host', apiKeyField: 'apiKey' },
	},
};

function makeService({
	baseUrl = BASE_URL as string | null,
	isAiGatewayLicensed = true,
	ownershipService = mock<OwnershipService>(),
	userRepository = mock<UserRepository>({ findOneBy: jest.fn().mockResolvedValue(null) }),
	urlService = mock<UrlService>({
		getInstanceBaseUrl: jest.fn().mockReturnValue(INSTANCE_BASE_URL),
	}),
} = {}) {
	const globalConfig = {
		aiAssistant: { baseUrl: baseUrl ?? undefined },
	} as unknown as GlobalConfig;
	const license = mock<License>({
		loadCertStr: jest.fn().mockResolvedValue(LICENSE_CERT),
		getConsumerId: jest.fn().mockReturnValue(CONSUMER_ID),
	});
	const licenseState = mock<LicenseState>({
		isAiGatewayLicensed: jest.fn().mockReturnValue(isAiGatewayLicensed),
	});
	const instanceSettings = mock<InstanceSettings>({ instanceId: INSTANCE_ID });
	return new AiGatewayService(
		globalConfig,
		license,
		licenseState,
		instanceSettings,
		ownershipService,
		userRepository,
		urlService,
	);
}

/** Mock: config fetch succeeds, then credentials fetch returns a token. */
function mockConfigThenToken(fetchMock: jest.Mock, token = 'mock-jwt-token') {
	fetchMock
		.mockResolvedValueOnce({
			ok: true,
			json: jest.fn().mockResolvedValue(MOCK_GATEWAY_CONFIG),
		})
		.mockResolvedValueOnce({
			ok: true,
			json: jest.fn().mockResolvedValue({ token, expiresIn: 3600 }),
		});
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

	describe('getGatewayConfig()', () => {
		it('fetches and returns config from the gateway', async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: jest.fn().mockResolvedValue(MOCK_GATEWAY_CONFIG),
			});
			const service = makeService();

			const result = await service.getGatewayConfig();

			expect(result).toEqual(MOCK_GATEWAY_CONFIG);
			expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/v1/gateway/config`);
		});

		it('caches config and does not re-fetch within TTL', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue(MOCK_GATEWAY_CONFIG),
			});
			const service = makeService();

			await service.getGatewayConfig();
			await service.getGatewayConfig();

			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		it('throws UserError when baseUrl is not configured', async () => {
			const service = makeService({ baseUrl: null });
			await expect(service.getGatewayConfig()).rejects.toThrow(UserError);
		});

		it('throws UserError when gateway returns non-ok status', async () => {
			fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
			const service = makeService();
			await expect(service.getGatewayConfig()).rejects.toThrow(UserError);
		});

		it('throws UserError when gateway returns invalid config shape', async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: jest.fn().mockResolvedValue({ nodes: 'not-an-array' }),
			});
			const service = makeService();
			await expect(service.getGatewayConfig()).rejects.toThrow(UserError);
		});
	});

	describe('getSyntheticCredential()', () => {
		it('throws FeatureNotLicensedError when not licensed and dev mode is off', async () => {
			const service = makeService({ isAiGatewayLicensed: false });
			await expect(
				service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID }),
			).rejects.toThrow(FeatureNotLicensedError);
		});

		it('throws UserError when baseUrl is not configured', async () => {
			const service = makeService({ baseUrl: null });
			await expect(
				service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID }),
			).rejects.toThrow(UserError);
		});

		it('throws UserError for unsupported credential type', async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: jest.fn().mockResolvedValue(MOCK_GATEWAY_CONFIG),
			});
			const service = makeService();
			await expect(
				service.getSyntheticCredential({ credentialType: 'openAiApi', userId: USER_ID }),
			).rejects.toThrow(UserError);
		});

		it('returns synthetic credential with apiKey (JWT) and host (gateway URL)', async () => {
			mockConfigThenToken(fetchMock, 'mock-jwt-token');
			const service = makeService();

			const result = await service.getSyntheticCredential({
				credentialType: 'googlePalmApi',
				userId: USER_ID,
			});

			expect(result).toEqual({
				apiKey: 'mock-jwt-token',
				host: `${BASE_URL}/v1/gateway/google`,
			});
		});

		it('fetches token from gateway with HeadersMetadataDto headers and licenseCert body', async () => {
			mockConfigThenToken(fetchMock);
			const service = makeService();

			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });

			expect(fetchMock).toHaveBeenNthCalledWith(
				2,
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
					body: JSON.stringify({ licenseCert: LICENSE_CERT, instanceUrl: INSTANCE_BASE_URL }),
				}),
			);
		});

		it('includes instanceUrl in token body', async () => {
			mockConfigThenToken(fetchMock);
			const service = makeService();

			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });

			const body = JSON.parse(fetchMock.mock.calls[1][1].body as string);
			expect(body.instanceUrl).toBe(INSTANCE_BASE_URL);
		});

		it('includes userEmail and userName in token body when user exists', async () => {
			const userRepository = mock<UserRepository>({
				findOneBy: jest
					.fn()
					.mockResolvedValue(
						mock<User>({ email: 'alice@example.com', firstName: 'Alice', lastName: 'Smith' }),
					),
			});
			mockConfigThenToken(fetchMock);
			const service = makeService({ userRepository });

			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });

			expect(fetchMock).toHaveBeenNthCalledWith(
				2,
				`${BASE_URL}/v1/gateway/credentials`,
				expect.objectContaining({
					body: JSON.stringify({
						licenseCert: LICENSE_CERT,
						userEmail: 'alice@example.com',
						userName: 'Alice Smith',
						instanceUrl: INSTANCE_BASE_URL,
					}),
				}),
			);
		});

		it('omits userName from token body when user has no first or last name', async () => {
			const userRepository = mock<UserRepository>({
				findOneBy: jest
					.fn()
					.mockResolvedValue(
						mock<User>({ email: 'alice@example.com', firstName: '', lastName: '' }),
					),
			});
			mockConfigThenToken(fetchMock);
			const service = makeService({ userRepository });

			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });

			const body = JSON.parse(fetchMock.mock.calls[1][1].body as string);
			expect(body.userEmail).toBe('alice@example.com');
			expect(body.userName).toBeUndefined();
		});

		it('omits userEmail and userName from token body when user is not found', async () => {
			mockConfigThenToken(fetchMock);
			const service = makeService(); // userRepository returns null by default

			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });

			const body = JSON.parse(fetchMock.mock.calls[1][1].body as string);
			expect(body).toEqual({ licenseCert: LICENSE_CERT, instanceUrl: INSTANCE_BASE_URL });
		});

		it('caches config and token — second call makes no additional fetches', async () => {
			mockConfigThenToken(fetchMock);
			const service = makeService();

			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });
			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });

			// Config + credentials fetched once each; both cached on second call
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});

		it('throws UserError when config gateway returns non-ok status', async () => {
			fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
			const service = makeService();
			await expect(
				service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID }),
			).rejects.toThrow(UserError);
		});

		it('resolves userId from projectId when userId is absent', async () => {
			const ownershipService = mock<OwnershipService>();
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(
				mock<User>({ id: 'owner-from-project' }),
			);
			mockConfigThenToken(fetchMock);
			const service = makeService({ ownershipService });

			await service.getSyntheticCredential({
				credentialType: 'googlePalmApi',
				userId: undefined,
				projectId: 'project-123',
			});

			expect(ownershipService.getPersonalProjectOwnerCached).toHaveBeenCalledWith('project-123');
			expect(fetchMock).toHaveBeenCalledWith(
				`${BASE_URL}/v1/gateway/credentials`,
				expect.objectContaining({
					headers: expect.objectContaining({ 'x-user-id': 'owner-from-project' }),
				}),
			);
		});

		it('resolves userId from workflowId when userId and projectId are absent', async () => {
			const ownershipService = mock<OwnershipService>();
			ownershipService.getWorkflowProjectCached.mockResolvedValue(
				mock<Project>({ id: 'project-from-wf' }),
			);
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(
				mock<User>({ id: 'owner-from-workflow' }),
			);
			mockConfigThenToken(fetchMock);
			const service = makeService({ ownershipService });

			await service.getSyntheticCredential({
				credentialType: 'googlePalmApi',
				userId: undefined,
				workflowId: 'workflow-abc',
			});

			expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith('workflow-abc');
			expect(ownershipService.getPersonalProjectOwnerCached).toHaveBeenCalledWith(
				'project-from-wf',
			);
			expect(fetchMock).toHaveBeenCalledWith(
				`${BASE_URL}/v1/gateway/credentials`,
				expect.objectContaining({
					headers: expect.objectContaining({ 'x-user-id': 'owner-from-workflow' }),
				}),
			);
		});

		it('falls back to instance owner when project has no personal owner (team project)', async () => {
			const ownershipService = mock<OwnershipService>();
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(null);
			ownershipService.getInstanceOwner.mockResolvedValue(mock<User>({ id: 'instance-owner-id' }));
			mockConfigThenToken(fetchMock);
			const service = makeService({ ownershipService });

			await service.getSyntheticCredential({
				credentialType: 'googlePalmApi',
				userId: undefined,
				projectId: 'project-123',
			});

			expect(ownershipService.getInstanceOwner).toHaveBeenCalled();
			expect(fetchMock).toHaveBeenCalledWith(
				`${BASE_URL}/v1/gateway/credentials`,
				expect.objectContaining({
					headers: expect.objectContaining({ 'x-user-id': 'instance-owner-id' }),
				}),
			);
		});

		it('throws UserError when getInstanceOwner throws (no instance owner found)', async () => {
			const ownershipService = mock<OwnershipService>();
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(null);
			ownershipService.getInstanceOwner.mockRejectedValue(new Error('No owner found'));
			mockConfigThenToken(fetchMock);
			const service = makeService({ ownershipService });

			await expect(
				service.getSyntheticCredential({
					credentialType: 'googlePalmApi',
					userId: undefined,
					projectId: 'project-123',
				}),
			).rejects.toThrow('Failed to resolve user for AI Gateway attribution.');
		});

		it('throws UserError when gateway token response is missing token field', async () => {
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue(MOCK_GATEWAY_CONFIG),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ expiresIn: 3600 }), // token missing
				});
			const service = makeService();
			await expect(
				service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID }),
			).rejects.toThrow(UserError);
		});
	});

	describe('getWallet()', () => {
		it('throws UserError when baseUrl is not configured', async () => {
			const service = makeService({ baseUrl: null });
			await expect(service.getWallet(USER_ID)).rejects.toThrow(UserError);
		});

		it('returns budget and balance from gateway wallet', async () => {
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ token: 'mock-jwt', expiresIn: 3600 }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ budget: 10, balance: 7 }),
				});
			const service = makeService();

			const result = await service.getWallet(USER_ID);

			expect(result).toEqual({ budget: 10, balance: 7 });
		});

		it('sends JWT Bearer token in Authorization header to credits endpoint', async () => {
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ token: 'mock-jwt', expiresIn: 3600 }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ budget: 10, balance: 7 }),
				});
			const service = makeService();

			await service.getWallet(USER_ID);

			expect(fetchMock).toHaveBeenNthCalledWith(
				1,
				`${BASE_URL}/v1/gateway/credentials`,
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ licenseCert: LICENSE_CERT, instanceUrl: INSTANCE_BASE_URL }),
				}),
			);
			expect(fetchMock).toHaveBeenNthCalledWith(2, `${BASE_URL}/v1/gateway/wallet`, {
				method: 'GET',
				headers: { Authorization: 'Bearer mock-jwt' },
			});
		});

		it('throws UserError when wallet gateway returns non-ok status', async () => {
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ token: 'mock-jwt', expiresIn: 3600 }),
				})
				.mockResolvedValueOnce({ ok: false, status: 429 });
			const service = makeService();
			await expect(service.getWallet(USER_ID)).rejects.toThrow(UserError);
		});

		it('throws UserError when gateway returns invalid response shape', async () => {
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ token: 'mock-jwt', expiresIn: 3600 }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ budget: 'not-a-number' }),
				});
			const service = makeService();
			await expect(service.getWallet(USER_ID)).rejects.toThrow(UserError);
		});
	});

	describe('getUsage()', () => {
		const MOCK_USAGE_RESPONSE = {
			entries: [{ provider: 'google', model: 'gemini-pro', timestamp: 1700000000, cost: 2 }],
			total: 1,
		};

		it('throws UserError when baseUrl is not configured', async () => {
			const service = makeService({ baseUrl: null });
			await expect(service.getUsage(USER_ID, 0, 10)).rejects.toThrow(UserError);
		});

		it('returns usage entries and total from gateway', async () => {
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ token: 'mock-jwt', expiresIn: 3600 }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue(MOCK_USAGE_RESPONSE),
				});
			const service = makeService();

			const result = await service.getUsage(USER_ID, 0, 10);

			expect(result).toEqual(MOCK_USAGE_RESPONSE);
		});

		it('sends offset and limit as query params with Bearer token', async () => {
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ token: 'mock-jwt', expiresIn: 3600 }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue(MOCK_USAGE_RESPONSE),
				});
			const service = makeService();

			await service.getUsage(USER_ID, 5, 25);

			const usageCall = fetchMock.mock.calls[1];
			expect(usageCall[0]).toContain('offset=5');
			expect(usageCall[0]).toContain('limit=25');
			expect(usageCall[1]).toEqual({
				method: 'GET',
				headers: { Authorization: 'Bearer mock-jwt' },
			});
		});

		it('throws UserError when gateway returns non-ok status', async () => {
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ token: 'mock-jwt', expiresIn: 3600 }),
				})
				.mockResolvedValueOnce({ ok: false, status: 500 });
			const service = makeService();
			await expect(service.getUsage(USER_ID, 0, 10)).rejects.toThrow(UserError);
		});

		it('throws UserError when response has invalid shape', async () => {
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ token: 'mock-jwt', expiresIn: 3600 }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ entries: 'not-an-array', total: 0 }),
				});
			const service = makeService();
			await expect(service.getUsage(USER_ID, 0, 10)).rejects.toThrow(UserError);
		});
	});

	describe('config cache TTL', () => {
		it('re-fetches config after TTL expires', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue(MOCK_GATEWAY_CONFIG),
			});
			const service = makeService();
			const dateSpy = jest.spyOn(Date, 'now');

			dateSpy.mockReturnValue(0);
			await service.getGatewayConfig();
			expect(fetchMock).toHaveBeenCalledTimes(1);

			// Still within TTL — no re-fetch
			dateSpy.mockReturnValue(30 * 60 * 1000);
			await service.getGatewayConfig();
			expect(fetchMock).toHaveBeenCalledTimes(1);

			// Past TTL (1 hour + 1 ms)
			dateSpy.mockReturnValue(60 * 60 * 1000 + 1);
			await service.getGatewayConfig();
			expect(fetchMock).toHaveBeenCalledTimes(2);

			dateSpy.mockRestore();
		});
	});

	describe('token cache size limit', () => {
		it('evicts the oldest entry when cache is full', async () => {
			const service = makeService();
			// @ts-expect-error — accessing private for test setup
			const cache = service.tokenCache as Map<
				string,
				{ token: string; expiresAt: number; refreshAt: number }
			>;

			// Fill cache to the 500-entry limit with synthetic entries
			for (let i = 0; i < 500; i++) {
				cache.set(`${INSTANCE_ID}:user-${i}`, {
					token: `token-${i}`,
					expiresAt: Date.now() + 1_000_000,
					refreshAt: Date.now() + 900_000,
				});
			}
			expect(cache.size).toBe(500);

			// Fetch for a new user — cache is at max, user-0 should be evicted
			fetchMock
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ token: 'new-token', expiresIn: 3600 }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: jest.fn().mockResolvedValue({ entries: [], total: 0 }),
				});

			await service.getUsage('new-user', 0, 1);

			expect(cache.size).toBe(500);
			expect(cache.has(`${INSTANCE_ID}:new-user`)).toBe(true);
			expect(cache.has(`${INSTANCE_ID}:user-0`)).toBe(false);
		});
	});

	describe('concurrent token requests', () => {
		it('deduplicates in-flight token fetches for the same user', async () => {
			const service = makeService();

			// Pre-warm config cache
			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: jest.fn().mockResolvedValue(MOCK_GATEWAY_CONFIG),
			});
			await service.getGatewayConfig();

			// Only one token response queued — concurrent calls must share it
			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: jest.fn().mockResolvedValue({ token: 'shared-token', expiresIn: 3600 }),
			});

			const [r1, r2, r3] = await Promise.all([
				service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID }),
				service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID }),
				service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID }),
			]);

			expect(r1.apiKey).toBe('shared-token');
			expect(r2.apiKey).toBe('shared-token');
			expect(r3.apiKey).toBe('shared-token');

			const credentialsCalls = fetchMock.mock.calls.filter((c) =>
				(c[0] as string).includes('/v1/gateway/credentials'),
			);
			expect(credentialsCalls).toHaveLength(1);
		});
	});
});
