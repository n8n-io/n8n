import type { LicenseState } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import type { GlobalConfig } from '@n8n/config';
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

/** A successful gateway response carrying the parsed body. */
function ok(body: unknown) {
	return { statusCode: 200, body };
}

/** A failed gateway response with the given status code. */
function fail(statusCode: number) {
	return { statusCode, body: {} };
}

let outboundHttp: jest.Mocked<OutboundHttp>;
let requestMock: jest.Mock;

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
		outboundHttp,
	);
}

/** Mock: config fetch succeeds, then credentials fetch returns a token. */
function mockConfigThenToken(token = 'mock-jwt-token') {
	requestMock
		.mockResolvedValueOnce(ok(MOCK_GATEWAY_CONFIG))
		.mockResolvedValueOnce(ok({ token, expiresIn: 3600 }));
}

describe('AiGatewayService', () => {
	beforeEach(() => {
		const httpClient = mock<HttpRequestClient>();
		requestMock = httpClient.request as jest.Mock;
		outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(httpClient);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getGatewayConfig()', () => {
		it('fetches and returns config from the gateway', async () => {
			requestMock.mockResolvedValueOnce(ok(MOCK_GATEWAY_CONFIG));
			const service = makeService();

			const result = await service.getGatewayConfig();

			expect(result).toEqual(MOCK_GATEWAY_CONFIG);
			expect(outboundHttp.requests).toHaveBeenCalledWith({ ssrf: 'disabled' });
			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({ method: 'GET', url: `${BASE_URL}/v1/gateway/config` }),
			);
		});

		it('caches config and does not re-fetch within TTL', async () => {
			requestMock.mockResolvedValue(ok(MOCK_GATEWAY_CONFIG));
			const service = makeService();

			await service.getGatewayConfig();
			await service.getGatewayConfig();

			expect(requestMock).toHaveBeenCalledTimes(1);
		});

		it('throws UserError when baseUrl is not configured', async () => {
			const service = makeService({ baseUrl: null });
			await expect(service.getGatewayConfig()).rejects.toThrow(UserError);
		});

		it('throws UserError when gateway returns non-ok status', async () => {
			requestMock.mockResolvedValueOnce(fail(503));
			const service = makeService();
			await expect(service.getGatewayConfig()).rejects.toThrow(UserError);
		});

		it('throws UserError when gateway returns invalid config shape', async () => {
			requestMock.mockResolvedValueOnce(ok({ nodes: 'not-an-array' }));
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
			requestMock.mockResolvedValueOnce(ok(MOCK_GATEWAY_CONFIG));
			const service = makeService();
			await expect(
				service.getSyntheticCredential({ credentialType: 'openAiApi', userId: USER_ID }),
			).rejects.toThrow(UserError);
		});

		it('returns synthetic credential with apiKey (JWT) and host (gateway URL)', async () => {
			mockConfigThenToken('mock-jwt-token');
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
			mockConfigThenToken();
			const service = makeService();

			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });

			expect(requestMock).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					method: 'POST',
					url: `${BASE_URL}/v1/gateway/credentials`,
					headers: {
						'Content-Type': 'application/json',
						'x-user-id': USER_ID,
						'x-consumer-id': CONSUMER_ID,
						'x-sdk-version': AI_ASSISTANT_SDK_VERSION,
						'x-n8n-version': N8N_VERSION,
						'x-instance-id': INSTANCE_ID,
					},
					body: { licenseCert: LICENSE_CERT, instanceUrl: INSTANCE_BASE_URL },
				}),
			);
		});

		it('includes instanceUrl in token body', async () => {
			mockConfigThenToken();
			const service = makeService();

			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });

			const body = requestMock.mock.calls[1][0].body as { instanceUrl: string };
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
			mockConfigThenToken();
			const service = makeService({ userRepository });

			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });

			expect(requestMock).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					url: `${BASE_URL}/v1/gateway/credentials`,
					body: {
						licenseCert: LICENSE_CERT,
						userEmail: 'alice@example.com',
						userName: 'Alice Smith',
						instanceUrl: INSTANCE_BASE_URL,
					},
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
			mockConfigThenToken();
			const service = makeService({ userRepository });

			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });

			const body = requestMock.mock.calls[1][0].body as { userEmail: string; userName?: string };
			expect(body.userEmail).toBe('alice@example.com');
			expect(body.userName).toBeUndefined();
		});

		it('omits userEmail and userName from token body when user is not found', async () => {
			mockConfigThenToken();
			const service = makeService(); // userRepository returns null by default

			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });

			const body = requestMock.mock.calls[1][0].body as Record<string, unknown>;
			expect(body).toEqual({ licenseCert: LICENSE_CERT, instanceUrl: INSTANCE_BASE_URL });
		});

		it('caches config and token — second call makes no additional fetches', async () => {
			mockConfigThenToken();
			const service = makeService();

			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });
			await service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID });

			// Config + credentials fetched once each; both cached on second call
			expect(requestMock).toHaveBeenCalledTimes(2);
		});

		it('throws UserError when config gateway returns non-ok status', async () => {
			requestMock.mockResolvedValueOnce(fail(503));
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
			mockConfigThenToken();
			const service = makeService({ ownershipService });

			await service.getSyntheticCredential({
				credentialType: 'googlePalmApi',
				userId: undefined,
				projectId: 'project-123',
			});

			expect(ownershipService.getPersonalProjectOwnerCached).toHaveBeenCalledWith('project-123');
			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					url: `${BASE_URL}/v1/gateway/credentials`,
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
			mockConfigThenToken();
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
			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					url: `${BASE_URL}/v1/gateway/credentials`,
					headers: expect.objectContaining({ 'x-user-id': 'owner-from-workflow' }),
				}),
			);
		});

		it('falls back to instance owner when project has no personal owner (team project)', async () => {
			const ownershipService = mock<OwnershipService>();
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(null);
			ownershipService.getInstanceOwner.mockResolvedValue(mock<User>({ id: 'instance-owner-id' }));
			mockConfigThenToken();
			const service = makeService({ ownershipService });

			await service.getSyntheticCredential({
				credentialType: 'googlePalmApi',
				userId: undefined,
				projectId: 'project-123',
			});

			expect(ownershipService.getInstanceOwner).toHaveBeenCalled();
			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					url: `${BASE_URL}/v1/gateway/credentials`,
					headers: expect.objectContaining({ 'x-user-id': 'instance-owner-id' }),
				}),
			);
		});

		it('throws UserError when getInstanceOwner throws (no instance owner found)', async () => {
			const ownershipService = mock<OwnershipService>();
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(null);
			ownershipService.getInstanceOwner.mockRejectedValue(new Error('No owner found'));
			mockConfigThenToken();
			const service = makeService({ ownershipService });

			await expect(
				service.getSyntheticCredential({
					credentialType: 'googlePalmApi',
					userId: undefined,
					projectId: 'project-123',
				}),
			).rejects.toThrow('Failed to resolve user for AI Gateway attribution.');
		});

		it('embeds executionId and workflowId in gateway URL when both are provided', async () => {
			mockConfigThenToken();
			const service = makeService();

			const result = await service.getSyntheticCredential({
				credentialType: 'googlePalmApi',
				userId: USER_ID,
				executionId: '29021',
				workflowId: 'R9JFXwkUCL1jZBuw',
			});

			expect(result).toEqual({
				apiKey: 'mock-jwt-token',
				host: `${BASE_URL}/v1/gateway/exec/29021/R9JFXwkUCL1jZBuw/google`,
			});
		});

		it('uses standard gateway URL when executionId is absent', async () => {
			mockConfigThenToken();
			const service = makeService();

			const result = await service.getSyntheticCredential({
				credentialType: 'googlePalmApi',
				userId: USER_ID,
				workflowId: 'R9JFXwkUCL1jZBuw',
			});

			expect(result).toEqual({
				apiKey: 'mock-jwt-token',
				host: `${BASE_URL}/v1/gateway/google`,
			});
		});

		it('uses standard gateway URL when workflowId is absent', async () => {
			mockConfigThenToken();
			const service = makeService();

			const result = await service.getSyntheticCredential({
				credentialType: 'googlePalmApi',
				userId: USER_ID,
				executionId: '29021',
			});

			expect(result).toEqual({
				apiKey: 'mock-jwt-token',
				host: `${BASE_URL}/v1/gateway/google`,
			});
		});

		it('URL-encodes executionId and workflowId in the gateway URL', async () => {
			mockConfigThenToken();
			const service = makeService();

			const result = await service.getSyntheticCredential({
				credentialType: 'googlePalmApi',
				userId: USER_ID,
				executionId: 'exec/with/slashes',
				workflowId: 'wf with spaces',
			});

			expect(result).toEqual({
				apiKey: 'mock-jwt-token',
				host: `${BASE_URL}/v1/gateway/exec/exec%2Fwith%2Fslashes/wf%20with%20spaces/google`,
			});
		});

		it('fans a single credential out to multiple gateway URLs when routing is present', async () => {
			const routingConfig = {
				...MOCK_GATEWAY_CONFIG,
				credentialTypes: ['browserbaseApi'],
				providerConfig: {
					browserbaseApi: {
						gatewayPath: '/v1/gateway/browserbase',
						urlField: 'baseUrl',
						apiKeyField: 'browserbaseApiKey',
						routing: {
							baseUrl: '/v1/gateway/browserbase',
							stagehandBaseUrl: '/v1/gateway/browserbaseStagehand',
						},
					},
				},
			};
			requestMock
				.mockResolvedValueOnce(ok(routingConfig))
				.mockResolvedValueOnce(ok({ token: 'mock-jwt-token', expiresIn: 3600 }));
			const service = makeService();

			const result = await service.getSyntheticCredential({
				credentialType: 'browserbaseApi',
				userId: USER_ID,
			});

			expect(result).toEqual({
				browserbaseApiKey: 'mock-jwt-token',
				baseUrl: `${BASE_URL}/v1/gateway/browserbase`,
				stagehandBaseUrl: `${BASE_URL}/v1/gateway/browserbaseStagehand`,
			});
		});

		it('embeds exec context in every routed gateway URL', async () => {
			const routingConfig = {
				...MOCK_GATEWAY_CONFIG,
				credentialTypes: ['browserbaseApi'],
				providerConfig: {
					browserbaseApi: {
						gatewayPath: '/v1/gateway/browserbase',
						urlField: 'baseUrl',
						apiKeyField: 'browserbaseApiKey',
						routing: {
							baseUrl: '/v1/gateway/browserbase',
							stagehandBaseUrl: '/v1/gateway/browserbaseStagehand',
						},
					},
				},
			};
			requestMock
				.mockResolvedValueOnce(ok(routingConfig))
				.mockResolvedValueOnce(ok({ token: 'mock-jwt-token', expiresIn: 3600 }));
			const service = makeService();

			const result = await service.getSyntheticCredential({
				credentialType: 'browserbaseApi',
				userId: USER_ID,
				executionId: '29021',
				workflowId: 'R9JFXwkUCL1jZBuw',
			});

			expect(result).toEqual({
				browserbaseApiKey: 'mock-jwt-token',
				baseUrl: `${BASE_URL}/v1/gateway/exec/29021/R9JFXwkUCL1jZBuw/browserbase`,
				stagehandBaseUrl: `${BASE_URL}/v1/gateway/exec/29021/R9JFXwkUCL1jZBuw/browserbaseStagehand`,
			});
		});

		it('uses standard gateway URL when gatewayPath does not start with the gateway prefix', async () => {
			const customConfig = {
				...MOCK_GATEWAY_CONFIG,
				providerConfig: {
					googlePalmApi: {
						...MOCK_GATEWAY_CONFIG.providerConfig.googlePalmApi,
						gatewayPath: '/other/v1/gateway/google',
					},
				},
			};
			requestMock
				.mockResolvedValueOnce(ok(customConfig))
				.mockResolvedValueOnce(ok({ token: 'mock-jwt-token', expiresIn: 3600 }));
			const service = makeService();

			const result = await service.getSyntheticCredential({
				credentialType: 'googlePalmApi',
				userId: USER_ID,
				executionId: '29021',
				workflowId: 'R9JFXwkUCL1jZBuw',
			});

			expect(result).toEqual({
				apiKey: 'mock-jwt-token',
				host: `${BASE_URL}/other/v1/gateway/google`,
			});
		});

		it('does not strip gateway prefix appearing mid-path when building exec URL', async () => {
			// gatewayPath contains the prefix string but NOT at the start —
			// the old .replace() would have corrupted the URL by stripping it from the middle.
			const customConfig = {
				...MOCK_GATEWAY_CONFIG,
				providerConfig: {
					googlePalmApi: {
						...MOCK_GATEWAY_CONFIG.providerConfig.googlePalmApi,
						gatewayPath: '/proxy/v1/gateway/google',
					},
				},
			};
			requestMock
				.mockResolvedValueOnce(ok(customConfig))
				.mockResolvedValueOnce(ok({ token: 'mock-jwt-token', expiresIn: 3600 }));
			const service = makeService();

			const result = await service.getSyntheticCredential({
				credentialType: 'googlePalmApi',
				userId: USER_ID,
				executionId: '29021',
				workflowId: 'R9JFXwkUCL1jZBuw',
			});

			// Path does not start with prefix → falls back to standard URL, prefix untouched
			expect(result).toEqual({
				apiKey: 'mock-jwt-token',
				host: `${BASE_URL}/proxy/v1/gateway/google`,
			});
		});

		it('throws UserError when gateway token response is missing token field', async () => {
			requestMock
				.mockResolvedValueOnce(ok(MOCK_GATEWAY_CONFIG))
				.mockResolvedValueOnce(ok({ expiresIn: 3600 })); // token missing
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
			requestMock
				.mockResolvedValueOnce(ok({ token: 'mock-jwt', expiresIn: 3600 }))
				.mockResolvedValueOnce(ok({ budget: 10, balance: 7 }));
			const service = makeService();

			const result = await service.getWallet(USER_ID);

			expect(result).toEqual({ budget: 10, balance: 7 });
		});

		it('sends JWT Bearer token in Authorization header to credits endpoint', async () => {
			requestMock
				.mockResolvedValueOnce(ok({ token: 'mock-jwt', expiresIn: 3600 }))
				.mockResolvedValueOnce(ok({ budget: 10, balance: 7 }));
			const service = makeService();

			await service.getWallet(USER_ID);

			expect(requestMock).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					method: 'POST',
					url: `${BASE_URL}/v1/gateway/credentials`,
					body: { licenseCert: LICENSE_CERT, instanceUrl: INSTANCE_BASE_URL },
				}),
			);
			expect(requestMock).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					method: 'GET',
					url: `${BASE_URL}/v1/gateway/wallet`,
					headers: { Authorization: 'Bearer mock-jwt' },
				}),
			);
		});

		it('throws UserError when wallet gateway returns non-ok status', async () => {
			requestMock
				.mockResolvedValueOnce(ok({ token: 'mock-jwt', expiresIn: 3600 }))
				.mockResolvedValueOnce(fail(429));
			const service = makeService();
			await expect(service.getWallet(USER_ID)).rejects.toThrow(UserError);
		});

		it('throws UserError when gateway returns invalid response shape', async () => {
			requestMock
				.mockResolvedValueOnce(ok({ token: 'mock-jwt', expiresIn: 3600 }))
				.mockResolvedValueOnce(ok({ budget: 'not-a-number' }));
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
			requestMock
				.mockResolvedValueOnce(ok({ token: 'mock-jwt', expiresIn: 3600 }))
				.mockResolvedValueOnce(ok(MOCK_USAGE_RESPONSE));
			const service = makeService();

			const result = await service.getUsage(USER_ID, 0, 10);

			expect(result).toEqual(MOCK_USAGE_RESPONSE);
		});

		it('sends offset and limit as query params with Bearer token', async () => {
			requestMock
				.mockResolvedValueOnce(ok({ token: 'mock-jwt', expiresIn: 3600 }))
				.mockResolvedValueOnce(ok(MOCK_USAGE_RESPONSE));
			const service = makeService();

			await service.getUsage(USER_ID, 5, 25);

			const usageRequest = requestMock.mock.calls[1][0] as {
				url: string;
				method: string;
				headers: Record<string, string>;
			};
			expect(usageRequest.url).toContain('offset=5');
			expect(usageRequest.url).toContain('limit=25');
			expect(usageRequest.method).toBe('GET');
			expect(usageRequest.headers).toEqual({ Authorization: 'Bearer mock-jwt' });
		});

		it('throws UserError when gateway returns non-ok status', async () => {
			requestMock
				.mockResolvedValueOnce(ok({ token: 'mock-jwt', expiresIn: 3600 }))
				.mockResolvedValueOnce(fail(500));
			const service = makeService();
			await expect(service.getUsage(USER_ID, 0, 10)).rejects.toThrow(UserError);
		});

		it('throws UserError when response has invalid shape', async () => {
			requestMock
				.mockResolvedValueOnce(ok({ token: 'mock-jwt', expiresIn: 3600 }))
				.mockResolvedValueOnce(ok({ entries: 'not-an-array', total: 0 }));
			const service = makeService();
			await expect(service.getUsage(USER_ID, 0, 10)).rejects.toThrow(UserError);
		});
	});

	describe('config cache TTL', () => {
		it('re-fetches config after TTL expires', async () => {
			requestMock.mockResolvedValue(ok(MOCK_GATEWAY_CONFIG));
			const service = makeService();
			const dateSpy = jest.spyOn(Date, 'now');

			dateSpy.mockReturnValue(0);
			await service.getGatewayConfig();
			expect(requestMock).toHaveBeenCalledTimes(1);

			// Still within TTL — no re-fetch
			dateSpy.mockReturnValue(30 * 60 * 1000);
			await service.getGatewayConfig();
			expect(requestMock).toHaveBeenCalledTimes(1);

			// Past TTL (1 hour + 1 ms)
			dateSpy.mockReturnValue(60 * 60 * 1000 + 1);
			await service.getGatewayConfig();
			expect(requestMock).toHaveBeenCalledTimes(2);

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
			requestMock
				.mockResolvedValueOnce(ok({ token: 'new-token', expiresIn: 3600 }))
				.mockResolvedValueOnce(ok({ entries: [], total: 0 }));

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
			requestMock.mockResolvedValueOnce(ok(MOCK_GATEWAY_CONFIG));
			await service.getGatewayConfig();

			// Only one token response queued — concurrent calls must share it
			requestMock.mockResolvedValueOnce(ok({ token: 'shared-token', expiresIn: 3600 }));

			const [r1, r2, r3] = await Promise.all([
				service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID }),
				service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID }),
				service.getSyntheticCredential({ credentialType: 'googlePalmApi', userId: USER_ID }),
			]);

			expect(r1.apiKey).toBe('shared-token');
			expect(r2.apiKey).toBe('shared-token');
			expect(r3.apiKey).toBe('shared-token');

			const credentialsCalls = requestMock.mock.calls.filter((c) =>
				(c[0].url as string).includes('/v1/gateway/credentials'),
			);
			expect(credentialsCalls).toHaveLength(1);
		});
	});
});
