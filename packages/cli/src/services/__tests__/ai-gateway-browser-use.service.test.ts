import { OperationalError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	AiGatewayBrowserUseService,
	toGatewayError,
} from '@/services/ai-gateway-browser-use.service';
import type { AiGatewayService } from '@/services/ai-gateway.service';

const TARGET_URL =
	'http://gateway.test/v1/gateway/exec/instance-ai/thread-1%7Cjob-1/browserbaseBrowserUse';
const attribution = { instanceAiThreadId: 'thread-1', instanceAiJobId: 'job-1' };

describe('AiGatewayBrowserUseService', () => {
	let aiGatewayService: ReturnType<typeof mock<AiGatewayService>>;
	let service: AiGatewayBrowserUseService;

	beforeEach(() => {
		aiGatewayService = mock<AiGatewayService>();
		aiGatewayService.getRequestTarget.mockResolvedValue({ url: TARGET_URL, token: 'user-jwt' });
		service = new AiGatewayBrowserUseService(aiGatewayService);
	});

	it.each([true, false])('is enabled when Gateway credits are enabled (%s)', (enabled) => {
		aiGatewayService.isEnabled.mockReturnValue(enabled);

		expect(service.isGatewayBrowserUseEnabled()).toBe(enabled);
	});

	describe('createSession()', () => {
		it('creates a session without keepAlive through the attributed gateway URL', async () => {
			aiGatewayService.gatewayRequest.mockResolvedValue({
				id: 'sess-1',
				connectUrl: 'wss://connect.example.com',
				status: 'RUNNING',
			});

			const session = await service.createSession({ userId: 'user-1', attribution });

			expect(session).toEqual({ id: 'sess-1', connectUrl: 'wss://connect.example.com' });
			expect(aiGatewayService.getRequestTarget).toHaveBeenCalledWith({
				userId: 'user-1',
				gatewayPath: '/v1/gateway/browserbaseBrowserUse',
				attribution,
			});
			expect(aiGatewayService.gatewayRequest).toHaveBeenCalledWith({
				method: 'POST',
				url: `${TARGET_URL}/v1/sessions`,
				headers: { 'X-BB-API-Key': 'user-jwt' },
				body: { keepAlive: false },
				disableFollowRedirect: true,
				mapErrorResponse: toGatewayError,
			});
		});

		it('throws when the response has no connect URL', async () => {
			aiGatewayService.gatewayRequest.mockResolvedValue({ id: 'sess-1' });

			await expect(service.createSession({ userId: 'user-1', attribution })).rejects.toThrow(
				'invalid browser session',
			);
		});
	});

	describe('releaseSession()', () => {
		it('posts to the session route', async () => {
			aiGatewayService.gatewayRequest.mockResolvedValue({});

			await service.releaseSession({ userId: 'user-1', attribution, sessionId: 'sess/1' });

			expect(aiGatewayService.gatewayRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: `${TARGET_URL}/v1/sessions/sess%2F1`,
					body: { status: 'REQUEST_RELEASE' },
					mapErrorResponse: toGatewayError,
				}),
			);
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
