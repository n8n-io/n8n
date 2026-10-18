import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AiGatewayBrowserUseService } from '@/services/ai-gateway-browser-use.service';
import type { AiGatewayService } from '@/services/ai-gateway.service';

const TARGET_URL = 'http://gateway.test/v1/gateway/exec/instance-ai/job-1/browserbaseBrowserUse';
const attribution = { instanceAiJobId: 'job-1' };

describe('AiGatewayBrowserUseService', () => {
	let requestMock: Mock;
	let aiGatewayService: ReturnType<typeof mock<AiGatewayService>>;
	let service: AiGatewayBrowserUseService;

	beforeEach(() => {
		const httpClient = mock<HttpRequestClient>();
		requestMock = httpClient.request as Mock;
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(httpClient);
		aiGatewayService = mock<AiGatewayService>();
		aiGatewayService.getRequestTarget.mockResolvedValue({ url: TARGET_URL, token: 'user-jwt' });
		service = new AiGatewayBrowserUseService(aiGatewayService, outboundHttp);
	});

	describe('createSession()', () => {
		it('creates a session without keepAlive through the attributed gateway URL', async () => {
			requestMock.mockResolvedValue({
				statusCode: 200,
				body: { id: 'sess-1', connectUrl: 'wss://connect.example.com', status: 'RUNNING' },
			});

			const session = await service.createSession({ userId: 'user-1', attribution });

			expect(session).toEqual({ id: 'sess-1', connectUrl: 'wss://connect.example.com' });
			expect(aiGatewayService.getRequestTarget).toHaveBeenCalledWith({
				userId: 'user-1',
				gatewayPath: '/v1/gateway/browserbaseBrowserUse',
				attribution,
			});
			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: `${TARGET_URL}/v1/sessions`,
					headers: { 'X-BB-API-Key': 'user-jwt' },
					body: { keepAlive: false },
				}),
			);
		});

		it('throws when the gateway refuses the request', async () => {
			requestMock.mockResolvedValue({ statusCode: 402, body: {} });

			await expect(service.createSession({ userId: 'user-1', attribution })).rejects.toThrow(
				'HTTP 402',
			);
		});

		it('throws when the response has no connect URL', async () => {
			requestMock.mockResolvedValue({ statusCode: 200, body: { id: 'sess-1' } });

			await expect(service.createSession({ userId: 'user-1', attribution })).rejects.toThrow(
				'invalid browser session',
			);
		});
	});

	describe('releaseSession()', () => {
		it('posts to the session route', async () => {
			requestMock.mockResolvedValue({ statusCode: 200, body: {} });

			await service.releaseSession({ userId: 'user-1', attribution, sessionId: 'sess/1' });

			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({ method: 'POST', url: `${TARGET_URL}/v1/sessions/sess%2F1` }),
			);
		});
	});
});
