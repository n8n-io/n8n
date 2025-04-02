import { mock } from 'jest-mock-extended';
import type { WebSocket } from 'ws';

import config from '@/config';
import type { User } from '@/databases/entities/user';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { Push } from '@/push';
import { SSEPush } from '@/push/sse.push';
import type { WebSocketPushRequest, SSEPushRequest } from '@/push/types';
import { WebSocketPush } from '@/push/websocket.push';
import { mockInstance } from '@test/mocking';

jest.unmock('@/push');
jest.mock('@/constants', () => ({
	inProduction: true,
}));

describe('Push', () => {
	const user = mock<User>();
	const sseBackend = mockInstance(SSEPush);
	const wsBackend = mockInstance(WebSocketPush);

	let push: Push;

	beforeEach(() => jest.resetAllMocks());

	describe('handleRequest', () => {
		describe('SSE backend', () => {
			const request = mock<SSEPushRequest>({ user, ws: undefined });

			beforeAll(() => {
				config.set('push.backend', 'sse');
				push = new Push(mock(), mock(), mock());
			});

			test('should validate pushRef on requests', () => {
				request.query = { pushRef: '' };

				expect(() => push.handleRequest(request, mock())).toThrow(
					new BadRequestError('The query parameter "pushRef" is missing!'),
				);

				expect(sseBackend.add).not.toHaveBeenCalled();
			});
		});

		describe('WebSocket backend', () => {
			const ws = mock<WebSocket>();
			const request = mock<WebSocketPushRequest>({ user, ws, headers: {} });

			beforeAll(() => {
				config.set('push.backend', 'websocket');
				push = new Push(mock(), mock(), mock());
			});

			test('should validate pushRef on requests for websocket backend', () => {
				request.query = { pushRef: '' };

				push.handleRequest(request, mock());

				expect(ws.send).toHaveBeenCalled();
				expect(ws.close).toHaveBeenCalledWith(1008);
				expect(wsBackend.add).not.toHaveBeenCalled();
			});

			test('should validate origin on websocket requests', () => {
				request.headers.origin = 'https://subdomain1.example.com';
				request.headers.host = 'subdomain2.example.com';
				request.query = { pushRef: 'valid-push-ref' };

				push.handleRequest(request, mock());

				expect(ws.send).toHaveBeenCalledWith('Invalid origin!');
				expect(ws.close).toHaveBeenCalledWith(1008);
				expect(wsBackend.add).not.toHaveBeenCalled();
			});
		});
	});
});
