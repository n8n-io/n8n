import type { LicenseState } from '@n8n/backend-common';
import { OperationalError, UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import {
	AiGatewayBrowserUseService,
	toGatewayError,
} from '@/services/ai-gateway-browser-use.service';
import type { AiGatewayService } from '@/services/ai-gateway.service';

const attribution = { instanceAiThreadId: 'thread-1', instanceAiTaskId: 'task-1' };

describe('AiGatewayBrowserUseService', () => {
	let aiGatewayService: ReturnType<typeof mock<AiGatewayService>>;
	let licenseState: ReturnType<typeof mock<LicenseState>>;
	let service: AiGatewayBrowserUseService;

	beforeEach(() => {
		aiGatewayService = mock<AiGatewayService>();
		licenseState = mock<LicenseState>();
		service = new AiGatewayBrowserUseService(aiGatewayService, licenseState);
	});

	it.each([
		[true, true, true],
		[false, true, false],
		[true, false, false],
	])(
		'is enabled only with Gateway credits enabled (%s) and Cloud usage-based billing (%s)',
		(gatewayEnabled, cloudUbbLicensed, expected) => {
			aiGatewayService.isEnabled.mockReturnValue(gatewayEnabled);
			licenseState.isAiGatewayCloudUbbLicensed.mockReturnValue(cloudUbbLicensed);

			expect(service.isGatewayBrowserUseEnabled()).toBe(expected);
		},
	);

	const sessionRequest = {
		provider: 'browserbaseBrowserUse',
		authHeaderKey: 'X-BB-API-Key',
		method: 'POST',
		userId: 'user-1',
		attribution,
		mapErrorResponse: toGatewayError,
		timeoutMs: 30_000,
	};

	describe('createSession()', () => {
		it('creates a session without keepAlive, at the live view size, through the gateway', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({
				id: 'sess-1',
				connectUrl: 'wss://connect.example.com',
				region: 'eu-central-1',
				status: 'RUNNING',
			});

			const session = await service.createSession({ userId: 'user-1', attribution });

			expect(session).toEqual({
				id: 'sess-1',
				connectUrl: 'wss://connect.example.com',
				region: 'eu-central-1',
			});
			expect(aiGatewayService.sendProviderRequest).toHaveBeenCalledWith({
				...sessionRequest,
				path: '/v1/sessions',
				body: { keepAlive: false, browserSettings: { viewport: { width: 1280, height: 800 } } },
			});
		});

		it('asks for a residential proxy in the given country', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({
				id: 'sess-1',
				connectUrl: 'wss://connect.example.com',
				region: 'eu-central-1',
			});

			await service.createSession({ userId: 'user-1', attribution, proxyCountry: 'DE' });

			expect(aiGatewayService.sendProviderRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.objectContaining({
						proxies: [{ type: 'browserbase', geolocation: { country: 'DE' } }],
					}),
				}),
			);
		});

		it('sends no proxies without a country', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({
				id: 'sess-1',
				connectUrl: 'wss://connect.example.com',
				region: 'eu-central-1',
			});

			await service.createSession({ userId: 'user-1', attribution, proxyCountry: undefined });

			const [{ body }] = aiGatewayService.sendProviderRequest.mock.calls[0];
			expect(body).not.toHaveProperty('proxies');
		});

		it("returns the session's region", async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({
				id: 'sess-1',
				connectUrl: 'wss://connect.example.com',
				region: 'eu-central-1',
			});

			const session = await service.createSession({ userId: 'user-1', attribution });

			expect(session).toEqual({
				id: 'sess-1',
				connectUrl: 'wss://connect.example.com',
				region: 'eu-central-1',
			});
		});

		it('sends the region, the proxy city and the context', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({
				id: 'sess-1',
				connectUrl: 'wss://connect.example.com',
				region: 'eu-central-1',
			});

			await service.createSession({
				userId: 'user-1',
				attribution,
				proxyCountry: 'DE',
				proxyCity: 'BERLIN',
				region: 'eu-central-1',
				contextId: 'ctx/1',
			});

			const [{ body }] = aiGatewayService.sendProviderRequest.mock.calls[0];
			expect(body).toEqual({
				keepAlive: false,
				region: 'eu-central-1',
				browserSettings: { viewport: { width: 1280, height: 800 }, context: { id: 'ctx/1' } },
				proxies: [{ type: 'browserbase', geolocation: { country: 'DE', city: 'BERLIN' } }],
			});
		});

		it('sends no proxies for a city without a country', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({
				id: 'sess-1',
				connectUrl: 'wss://connect.example.com',
				region: 'eu-central-1',
			});

			await service.createSession({ userId: 'user-1', attribution, proxyCity: 'BERLIN' });

			const [{ body }] = aiGatewayService.sendProviderRequest.mock.calls[0];
			expect(body).not.toHaveProperty('proxies');
		});

		it('throws when the response has no region', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({
				id: 'sess-1',
				connectUrl: 'wss://connect.example.com',
			});

			await expect(service.createSession({ userId: 'user-1', attribution })).rejects.toThrow(
				'invalid browser session',
			);
		});

		it('throws when the response has no connect URL', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({ id: 'sess-1' });

			await expect(service.createSession({ userId: 'user-1', attribution })).rejects.toThrow(
				'invalid browser session',
			);
		});
	});

	describe('getLiveView()', () => {
		it("reads the session's live view link", async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({
				debuggerFullscreenUrl: 'https://live.example.com/1',
				pages: [],
			});

			const view = await service.getLiveView({
				userId: 'user-1',
				attribution,
				sessionId: 'sess/1',
			});

			expect(view).toEqual({ debuggerFullscreenUrl: 'https://live.example.com/1', pages: [] });
			expect(aiGatewayService.sendProviderRequest).toHaveBeenCalledWith({
				...sessionRequest,
				method: 'GET',
				path: '/v1/sessions/sess%2F1/debug',
			});
		});

		it('reads the live view link of each tab', async () => {
			const pages = [
				{ id: 'TARGET-1', debuggerFullscreenUrl: 'https://live.example.com/1' },
				{ id: 'TARGET-2', debuggerFullscreenUrl: 'https://live.example.com/2' },
			];
			aiGatewayService.sendProviderRequest.mockResolvedValue({
				debuggerFullscreenUrl: 'https://live.example.com/1',
				pages,
			});

			const view = await service.getLiveView({
				userId: 'user-1',
				attribution,
				sessionId: 'sess-1',
			});

			expect(view).toEqual({ debuggerFullscreenUrl: 'https://live.example.com/1', pages });
		});

		it('reads a response with no tab list as no tabs', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({
				debuggerFullscreenUrl: 'https://live.example.com/1',
			});

			const view = await service.getLiveView({
				userId: 'user-1',
				attribution,
				sessionId: 'sess-1',
			});

			expect(view).toEqual({ debuggerFullscreenUrl: 'https://live.example.com/1', pages: [] });
		});

		it('reads a tab list it cannot read as no tabs, and keeps the first tab link', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({
				debuggerFullscreenUrl: 'https://live.example.com/1',
				pages: [{ id: 'target-1' }],
			});

			const view = await service.getLiveView({
				userId: 'user-1',
				attribution,
				sessionId: 'sess-1',
			});

			expect(view).toEqual({ debuggerFullscreenUrl: 'https://live.example.com/1', pages: [] });
		});

		it('throws when the response has no live view link', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({ pages: [] });

			await expect(
				service.getLiveView({ userId: 'user-1', attribution, sessionId: 'sess-1' }),
			).rejects.toThrow('invalid browser live view');
		});
	});

	describe('releaseSession()', () => {
		it('posts a release to the session route', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({});

			await service.releaseSession({ userId: 'user-1', attribution, sessionId: 'sess/1' });

			expect(aiGatewayService.sendProviderRequest).toHaveBeenCalledWith({
				...sessionRequest,
				path: '/v1/sessions/sess%2F1',
				body: { status: 'REQUEST_RELEASE' },
			});
		});
	});
	const savedContext = {
		id: 'ctx-1',
		domain: 'example.com',
		region: 'eu-central-1',
		proxyCountry: 'DE',
		proxyCity: 'BERLIN',
		savedAt: '2026-11-01T10:00:00.000Z',
		lastUsedAt: '2026-11-02T09:30:00.000Z',
	};

	const parsedSavedContext = {
		...savedContext,
		savedAt: new Date('2026-11-01T10:00:00.000Z'),
		lastUsedAt: new Date('2026-11-02T09:30:00.000Z'),
	};

	describe('createContext()', () => {
		it('creates an empty context for the task', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({ id: 'ctx-1' });

			const context = await service.createContext({ userId: 'user-1', attribution });

			expect(context).toEqual({ id: 'ctx-1' });
			expect(aiGatewayService.sendProviderRequest).toHaveBeenCalledWith({
				...sessionRequest,
				path: '/v1/contexts',
				body: {},
			});
		});

		it.each([{}, { id: '' }, null])('throws when the response is %j', async (response) => {
			aiGatewayService.sendProviderRequest.mockResolvedValue(response);

			await expect(service.createContext({ userId: 'user-1', attribution })).rejects.toThrow(
				'Could not read the new browser login. Try again later.',
			);
		});
	});

	describe('saveContext()', () => {
		it('saves the context for the domain, where the login was made', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue(savedContext);

			const saved = await service.saveContext({
				userId: 'user-1',
				attribution,
				contextId: 'ctx/1',
				domain: 'example.com',
				region: 'eu-central-1',
				proxyCountry: 'DE',
				proxyCity: 'BERLIN',
			});

			expect(saved).toEqual(parsedSavedContext);
			expect(saved.savedAt).toBeInstanceOf(Date);
			expect(aiGatewayService.sendProviderRequest).toHaveBeenCalledWith({
				...sessionRequest,
				path: '/v1/contexts/ctx%2F1/save',
				body: {
					domain: 'example.com',
					region: 'eu-central-1',
					proxyCountry: 'DE',
					proxyCity: 'BERLIN',
				},
			});
		});

		it('sends no proxy location without a country', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue(savedContext);

			await service.saveContext({
				userId: 'user-1',
				attribution,
				contextId: 'ctx-1',
				domain: 'example.com',
				region: 'eu-central-1',
				proxyCity: 'BERLIN',
			});

			const [{ body }] = aiGatewayService.sendProviderRequest.mock.calls[0];
			expect(body).toEqual({ domain: 'example.com', region: 'eu-central-1' });
		});

		it('reads a saved context without a proxy location', async () => {
			const { proxyCountry, proxyCity, ...withoutProxy } = savedContext;
			aiGatewayService.sendProviderRequest.mockResolvedValue(withoutProxy);

			const saved = await service.saveContext({
				userId: 'user-1',
				attribution,
				contextId: 'ctx-1',
				domain: 'example.com',
				region: 'eu-central-1',
			});

			expect(saved).not.toHaveProperty('proxyCountry');
			expect(saved).not.toHaveProperty('proxyCity');
		});

		it.each([
			['no domain', { ...savedContext, domain: undefined }],
			['no region', { ...savedContext, region: undefined }],
			['a date that is not ISO', { ...savedContext, savedAt: 'yesterday' }],
			['no last use', { ...savedContext, lastUsedAt: undefined }],
		])('throws when the response has %s', async (_, response) => {
			aiGatewayService.sendProviderRequest.mockResolvedValue(response);

			await expect(
				service.saveContext({
					userId: 'user-1',
					attribution,
					contextId: 'ctx-1',
					domain: 'example.com',
					region: 'eu-central-1',
				}),
			).rejects.toThrow('Could not read the saved login. Try again later.');
		});
	});

	describe('listSavedContexts()', () => {
		const listRequest = {
			provider: 'browserbaseBrowserUse',
			authHeaderKey: 'X-BB-API-Key',
			method: 'GET',
			userId: 'user-1',
			mapErrorResponse: toGatewayError,
			timeoutMs: 30_000,
		};

		it('lists the saved contexts without attribution', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({ contexts: [savedContext] });

			const contexts = await service.listSavedContexts({ userId: 'user-1' });

			expect(contexts).toEqual([parsedSavedContext]);
			expect(aiGatewayService.sendProviderRequest).toHaveBeenCalledWith({
				...listRequest,
				path: '/v1/contexts',
			});
		});

		it.each([
			['no context list', {}],
			['a context it cannot read', { contexts: [{ ...savedContext, savedAt: 'yesterday' }] }],
		])('throws when the response has %s', async (_, response) => {
			aiGatewayService.sendProviderRequest.mockResolvedValue(response);

			await expect(service.listSavedContexts({ userId: 'user-1' })).rejects.toThrow(
				'Could not read the saved logins. Try again later.',
			);
		});
	});

	describe('deleteContext()', () => {
		it('deletes the context without attribution', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({});

			await service.deleteContext({ userId: 'user-1', contextId: 'ctx/1' });

			expect(aiGatewayService.sendProviderRequest).toHaveBeenCalledWith({
				provider: 'browserbaseBrowserUse',
				authHeaderKey: 'X-BB-API-Key',
				method: 'DELETE',
				path: '/v1/contexts/ctx%2F1',
				userId: 'user-1',
				mapErrorResponse: toGatewayError,
				timeoutMs: 30_000,
			});
		});
	});
});

describe('toGatewayError()', () => {
	it('gives a UserError when the gateway refuses the request', () => {
		const error = toGatewayError({ statusCode: 402, body: {} });

		expect(error).toBeInstanceOf(UserError);
		expect(error.message).toContain('HTTP 402');
	});

	it("passes on the gateway's own error message", () => {
		const error = toGatewayError({
			statusCode: 402,
			body: {
				error: {
					message: 'Your Gateway credits have been depleted. Please top up to continue.',
					type: 'ai_gateway_request_error',
				},
			},
		});

		expect(error).toBeInstanceOf(UserError);
		expect(error.message).toBe(
			'Your Gateway credits have been depleted. Please top up to continue.',
		);
	});

	it('does not pass on an error message that is not from the gateway', () => {
		const error = toGatewayError({
			statusCode: 400,
			body: { error: { message: 'Invalid project id proj_123', type: 'upstream_error' } },
		});

		expect(error.message).toBe('Failed to complete the browser session request (HTTP 400).');
	});

	it('does not pass on a message outside the gateway error envelope', () => {
		const error = toGatewayError({
			statusCode: 402,
			body: {
				message: 'Your Gateway credits have been depleted. Please top up to continue.',
				type: 'ai_gateway_request_error',
			},
		});

		expect(error.message).toBe('Failed to complete the browser session request (HTTP 402).');
	});

	it("keeps only the status code and the gateway's own error for the logs", () => {
		const gatewayError = toGatewayError({
			statusCode: 402,
			body: { error: { message: 'Top up your credits.', type: 'ai_gateway_request_error' } },
		});
		const upstreamError = toGatewayError({
			statusCode: 500,
			body: { error: { message: 'Invalid project id proj_123', type: 'upstream_error' } },
		});

		expect(gatewayError.extra).toEqual({
			statusCode: 402,
			gatewayErrorType: 'ai_gateway_request_error',
			gatewayErrorMessage: 'Top up your credits.',
		});
		expect(upstreamError.extra).toEqual({ statusCode: 500 });
	});

	it('gives an OperationalError when the gateway fails', () => {
		const error = toGatewayError({ statusCode: 502, body: {} });

		expect(error).toBeInstanceOf(OperationalError);
		expect(error.message).toContain('HTTP 502');
	});
});
