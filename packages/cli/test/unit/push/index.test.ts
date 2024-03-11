import type { WebSocket } from 'ws';
import config from '@/config';
import type { User } from '@db/entities/User';
import { Push } from '@/push';
import { SSEPush } from '@/push/sse.push';
import { WebSocketPush } from '@/push/websocket.push';
import type { WebSocketPushRequest, SSEPushRequest } from '@/push/types';
import { mockInstance } from '../../shared/mocking';
import { mock } from 'jest-mock-extended';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

jest.unmock('@/push');

describe('Push', () => {
	const user = mock<User>();

	const sseBackend = mockInstance(SSEPush);
	const wsBackend = mockInstance(WebSocketPush);

	test('should validate sessionId on requests for websocket backend', () => {
		config.set('push.backend', 'websocket');
		const push = new Push();
		const ws = mock<WebSocket>();
		const request = mock<WebSocketPushRequest>({ user, ws });
		request.query = { sessionId: '' };
		push.handleRequest(request, mock());

		expect(ws.send).toHaveBeenCalled();
		expect(ws.close).toHaveBeenCalledWith(1008);
		expect(wsBackend.add).not.toHaveBeenCalled();
	});

	test('should validate sessionId on requests for SSE backend', () => {
		config.set('push.backend', 'sse');
		const push = new Push();
		const request = mock<SSEPushRequest>({ user, ws: undefined });
		request.query = { sessionId: '' };
		expect(() => push.handleRequest(request, mock())).toThrow(BadRequestError);

		expect(sseBackend.add).not.toHaveBeenCalled();
	});
});
