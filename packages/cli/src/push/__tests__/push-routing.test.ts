import type { PushMessage } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { EventEmitter } from 'events';
import type { InstanceSettings } from 'n8n-core';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type WebSocket from 'ws';

import { Push } from '@/push';
import type { PushConfig } from '@/push/push.config';
import { WebSocketPush } from '@/push/websocket.push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

vi.unmock('@/push');
vi.useFakeTimers();

class MockWebSocket extends EventEmitter {
	isAlive = true;

	ping = vi.fn();

	send = vi.fn();

	terminate = vi.fn();

	close = vi.fn();
}

const createMockWebSocket = () => new MockWebSocket() as unknown as Mocked<WebSocket>;

describe('Push routing', () => {
	const PUSH_REF = 'push-ref';
	const USER_A = 'user-a';
	const USER_B = 'user-b';
	const RELAY_COMMAND = 'relay-execution-lifecycle-event';
	const pushMessage: PushMessage = { type: 'executionRecovered', data: { executionId: 'exec-1' } };
	const expectedFrame = JSON.stringify(pushMessage);

	const logger = mock<Logger>();
	const publisher = mock<Publisher>();
	let backend: WebSocketPush;

	const createPush = (flags: { isWorker: boolean; isMultiMain: boolean }) =>
		new Push(
			mock<PushConfig>({ backend: 'websocket' }),
			mock<InstanceSettings>(flags),
			logger,
			mock(),
			publisher,
		);

	beforeEach(() => {
		vi.resetAllMocks();
		logger.scoped.mockReturnValue(logger);
		backend = new WebSocketPush(mock(), mock());
		Container.set(WebSocketPush, backend);
	});

	it('relays a message for a pushRef that this main does not hold', () => {
		const push = createPush({ isWorker: false, isMultiMain: true });

		push.send(pushMessage, PUSH_REF, USER_A);

		expect(publisher.publishCommand).toHaveBeenCalledWith(
			expect.objectContaining({
				command: RELAY_COMMAND,
				payload: expect.objectContaining({ pushRef: PUSH_REF }),
			}),
		);
	});

	it('relays every message on a worker', () => {
		const socket = createMockWebSocket();
		backend.add(PUSH_REF, USER_A, socket);
		const push = createPush({ isWorker: true, isMultiMain: false });

		push.send(pushMessage, PUSH_REF, USER_A);

		expect(publisher.publishCommand).toHaveBeenCalledWith(
			expect.objectContaining({ command: RELAY_COMMAND }),
		);
		expect(socket.send).not.toHaveBeenCalled();
	});

	it('delivers a relayed message to the local socket of its user', () => {
		const socket = createMockWebSocket();
		backend.add(PUSH_REF, USER_A, socket);
		const push = createPush({ isWorker: false, isMultiMain: true });

		push.handleRelayExecutionLifecycleEvent({
			...pushMessage,
			pushRef: PUSH_REF,
			asBinary: false,
			userId: USER_A,
		});

		expect(socket.send).toHaveBeenCalledWith(expectedFrame, { binary: false });
	});

	it('relays when the local socket for the pushRef belongs to another user', () => {
		backend.add(PUSH_REF, USER_B, createMockWebSocket());
		const push = createPush({ isWorker: false, isMultiMain: true });

		push.send(pushMessage, PUSH_REF, USER_A);

		expect(publisher.publishCommand).toHaveBeenCalledWith(
			expect.objectContaining({
				command: RELAY_COMMAND,
				payload: expect.objectContaining({ userId: USER_A }),
			}),
		);
	});

	it('drops a relayed message when the local socket for the pushRef belongs to another user', () => {
		const otherUserSocket = createMockWebSocket();
		backend.add(PUSH_REF, USER_B, otherUserSocket);
		const push = createPush({ isWorker: false, isMultiMain: true });

		push.handleRelayExecutionLifecycleEvent({
			...pushMessage,
			pushRef: PUSH_REF,
			asBinary: false,
			userId: USER_A,
		});

		expect(otherUserSocket.send).not.toHaveBeenCalled();
	});

	it('drops a relayed message without a user id', () => {
		const socket = createMockWebSocket();
		backend.add(PUSH_REF, USER_A, socket);
		const push = createPush({ isWorker: false, isMultiMain: true });

		push.handleRelayExecutionLifecycleEvent({ ...pushMessage, pushRef: PUSH_REF, asBinary: false });

		expect(socket.send).not.toHaveBeenCalled();
	});

	it('does not relay a message without a user id', () => {
		const push = createPush({ isWorker: false, isMultiMain: true });

		push.send(pushMessage, PUSH_REF, undefined);

		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});
});
