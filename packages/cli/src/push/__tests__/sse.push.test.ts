import { type PushMessage } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';
import EventEmitter from 'node:events';

import { SSEPush } from '@/push/sse.push';
import type { PushRequest, PushResponse } from '@/push/types';

jest.useFakeTimers();

const createMockConnection = () => {
	const req = mock(new EventEmitter() as PushRequest);
	req.socket = mock();
	const res = mock(new EventEmitter() as PushResponse);
	return { req, res };
};

describe('SSEPush', () => {
	const userId = 'test-user';
	const executionId = 'test-execution-id';

	const pushRef = 'push-ref';
	const connection = createMockConnection();
	const { req, res } = connection;

	const pushRef2 = 'push-ref-2';
	const connection2 = createMockConnection();

	const pushMessage: PushMessage = { type: 'executionRecovered', data: { executionId } };
	const expectedMsg = JSON.stringify(pushMessage);

	let ssePush: SSEPush;

	beforeEach(() => {
		jest.resetAllMocks();
		ssePush = new SSEPush(mock(), mock());
		ssePush.add(pushRef, userId, connection);
		ssePush.add(pushRef2, userId, connection2);
	});

	describe('add', () => {
		it('adds a connection', () => {
			expect(req.socket.setTimeout).toHaveBeenCalledWith(0);
			expect(req.socket.setNoDelay).toHaveBeenCalledWith(true);
			expect(req.socket.setKeepAlive).toHaveBeenCalledWith(true);

			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Type',
				'text/event-stream; charset=UTF-8',
			);
			expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
			expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
			expect(res.writeHead).toHaveBeenCalledWith(200);

			expect(res.write).toHaveBeenCalledWith(':ok\n\n');
			expect(res.flush).toHaveBeenCalled();
		});
	});

	describe('closes a connection', () => {
		test.each([
			['end', req],
			['close', req],
			['finish', res],
		])('on "%s" event', (event, emitter) => {
			expect(ssePush.hasPushRef(pushRef)).toBe(true);
			emitter.emit(event);
			expect(ssePush.hasPushRef(pushRef)).toBe(false);
		});
	});

	describe('sends data', () => {
		beforeEach(() => jest.clearAllMocks());

		it('to one connection', () => {
			ssePush.sendToOne(pushMessage, pushRef, userId);

			expect(connection.res.write).toHaveBeenCalledWith(`data: ${expectedMsg}\n\n`);
			expect(connection.res.flush).toHaveBeenCalled();
			expect(connection2.res.write).not.toHaveBeenCalled();
		});

		it('to all connections', () => {
			ssePush.sendToAll(pushMessage);

			expect(connection.res.write).toHaveBeenCalledWith(`data: ${expectedMsg}\n\n`);
			expect(connection.res.flush).toHaveBeenCalled();
			expect(connection2.res.write).toHaveBeenCalledWith(`data: ${expectedMsg}\n\n`);
			expect(connection2.res.flush).toHaveBeenCalled();
		});

		it('to a specific user', () => {
			ssePush.sendToUsers(pushMessage, [userId]);

			expect(connection.res.write).toHaveBeenCalledWith(`data: ${expectedMsg}\n\n`);
			expect(connection.res.flush).toHaveBeenCalled();
			expect(connection2.res.write).toHaveBeenCalledWith(`data: ${expectedMsg}\n\n`);
			expect(connection2.res.flush).toHaveBeenCalled();
		});
	});

	it('pings all connections', () => {
		jest.runOnlyPendingTimers();

		expect(connection.res.write).toHaveBeenCalledWith(':ping\n\n');
		expect(connection.res.flush).toHaveBeenCalled();
		expect(connection2.res.write).toHaveBeenCalledWith(':ping\n\n');
		expect(connection2.res.flush).toHaveBeenCalled();
	});

	it('closes all connections', () => {
		ssePush.closeAllConnections();

		expect(connection.res.end).toHaveBeenCalled();
		expect(connection2.res.end).toHaveBeenCalled();
	});

	test.each([
		['end', 'req'],
		['close', 'req'],
		['finish', 'res'],
	])(
		'keeps the new connection on "%s" event from the replaced connection of the same user',
		(event, emitterKey) => {
			const push = new SSEPush(mock(), mock());
			const oldConn = createMockConnection();
			const newConn = createMockConnection();
			push.add(pushRef, userId, oldConn);
			push.add(pushRef, userId, newConn);

			oldConn[emitterKey as 'req' | 'res'].emit(event);
			push.sendToOne(pushMessage, pushRef, userId);

			expect(newConn.res.write).toHaveBeenCalledWith(`data: ${expectedMsg}\n\n`);
		},
	);

	describe('when another user connects with the same push ref', () => {
		const otherUserId = 'other-user';
		let sharedPush: SSEPush;
		let userConn: ReturnType<typeof createMockConnection>;
		let otherUserConn: ReturnType<typeof createMockConnection>;

		beforeEach(() => {
			sharedPush = new SSEPush(mock(), mock());
			userConn = createMockConnection();
			otherUserConn = createMockConnection();
			sharedPush.add(pushRef, userId, userConn);
			sharedPush.add(pushRef, otherUserId, otherUserConn);
		});

		it('keeps the connection of the first user open', () => {
			expect(userConn.res.end).not.toHaveBeenCalled();
		});

		test.each([
			['end', 'req'],
			['close', 'req'],
			['finish', 'res'],
		])(
			'keeps the first user\'s connection on "%s" event from the other user\'s connection',
			(event, emitterKey) => {
				otherUserConn[emitterKey as 'req' | 'res'].emit(event);

				sharedPush.sendToOne(pushMessage, pushRef, userId);

				expect(userConn.res.write).toHaveBeenCalledWith(`data: ${expectedMsg}\n\n`);
			},
		);
	});
});
