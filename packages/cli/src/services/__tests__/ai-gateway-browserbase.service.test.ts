import { mock } from 'vitest-mock-extended';

import { AiGatewayBrowserbaseService } from '@/services/ai-gateway-browserbase.service';
import type { AiGatewayService } from '@/services/ai-gateway.service';

const USER_ID = 'user-abc';
const SOURCE_HEADERS = { 'x-n8n-request-source': 'ai-assistant' };

describe('AiGatewayBrowserbaseService', () => {
	const aiGatewayService = mock<AiGatewayService>();
	const service = new AiGatewayBrowserbaseService(aiGatewayService);

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('createSession()', () => {
		it('creates a session billed to Assistant credits and returns its id and connect URL', async () => {
			aiGatewayService.sendGatewayRequestForUser.mockResolvedValue({
				id: 'sess-1',
				connectUrl: 'wss://connect.browserbase.com?signingKey=abc',
				status: 'RUNNING',
			});

			const result = await service.createSession(USER_ID);

			expect(result).toEqual({
				sessionId: 'sess-1',
				connectUrl: 'wss://connect.browserbase.com?signingKey=abc',
			});
			expect(aiGatewayService.sendGatewayRequestForUser).toHaveBeenCalledWith(
				USER_ID,
				{
					method: 'POST',
					path: '/browserbase/v1/sessions',
					headers: SOURCE_HEADERS,
					tokenHeader: 'x-bb-api-key',
					body: {},
				},
				expect.any(String),
			);
		});

		it.each([
			['id', { connectUrl: 'wss://connect.browserbase.com' }],
			['connectUrl', { id: 'sess-1' }],
		])('throws when the response has no %s', async (_field, response) => {
			aiGatewayService.sendGatewayRequestForUser.mockResolvedValue(response);

			await expect(service.createSession(USER_ID)).rejects.toThrow(
				'Gateway credits returned an invalid browser session response.',
			);
		});
	});

	describe('releaseSession()', () => {
		it('asks the gateway to release the session', async () => {
			aiGatewayService.sendGatewayRequestForUser.mockResolvedValue({});

			await service.releaseSession(USER_ID, 'sess/1');

			expect(aiGatewayService.sendGatewayRequestForUser).toHaveBeenCalledWith(
				USER_ID,
				{
					method: 'POST',
					path: '/browserbase/v1/sessions/sess%2F1',
					headers: SOURCE_HEADERS,
					tokenHeader: 'x-bb-api-key',
					body: { status: 'REQUEST_RELEASE' },
				},
				expect.any(String),
			);
		});
	});
});
