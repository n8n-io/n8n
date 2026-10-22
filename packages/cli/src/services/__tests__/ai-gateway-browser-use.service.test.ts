import type { LicenseState } from '@n8n/backend-common';
import { OperationalError, UserError } from 'n8n-workflow';
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
	};

	describe('createSession()', () => {
		it('creates a session without keepAlive through the gateway', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({
				id: 'sess-1',
				connectUrl: 'wss://connect.example.com',
				status: 'RUNNING',
			});

			const session = await service.createSession({ userId: 'user-1', attribution });

			expect(session).toEqual({ id: 'sess-1', connectUrl: 'wss://connect.example.com' });
			expect(aiGatewayService.sendProviderRequest).toHaveBeenCalledWith({
				...sessionRequest,
				path: '/v1/sessions',
				body: { keepAlive: false },
			});
		});

		it('throws when the response has no connect URL', async () => {
			aiGatewayService.sendProviderRequest.mockResolvedValue({ id: 'sess-1' });

			await expect(service.createSession({ userId: 'user-1', attribution })).rejects.toThrow(
				'invalid browser session',
			);
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

	it('gives an OperationalError when the gateway fails', () => {
		const error = toGatewayError({ statusCode: 502, body: {} });

		expect(error).toBeInstanceOf(OperationalError);
		expect(error.message).toContain('HTTP 502');
	});
});
