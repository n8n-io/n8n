import { ConnectionClosedError, ConnectionLostError, ConnectionTimeoutError } from './errors';
import { ImapSimple, type CloseReason } from './imap-simple';
import { box, NOWHERE, transportFactory, settle, type FakeImap } from '../test/fake-imap';

const WATCHING = { mailbox: 'INBOX' };

/** Runs `restore` out of tries. Each one settles over several ticks before the next backoff. */
const runOutTries = async () => {
	for (let i = 0; i < 8; i++) {
		await settle();
		await vi.advanceTimersByTimeAsync(20_000);
	}
	await settle();
};

/** The transport settles through `setImmediate`, so only the timers under test are faked. */
const useTimers = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

afterEach(() => vi.useRealTimers());

const connect = async (
	reconnect: Parameters<typeof ImapSimple.connect>[1],
	init?: (transport: FakeImap, attempt: number) => void,
) => {
	const factory = transportFactory(init);
	const connection = await ImapSimple.connect(NOWHERE, reconnect, factory.create);

	const events = {
		error: vi.fn<(error: Error) => void>(),
		close: vi.fn<(reason: CloseReason) => void>(),
		reconnect: vi.fn(),
		arrival: vi.fn(),
	};
	connection.onError(events.error).onClose(events.close).onReconnect(events.reconnect);

	return { connection, factory, events, imap: () => factory.latest() };
};

describe('reconnect', () => {
	describe('after a drop', () => {
		it('puts a fresh transport in place and reopens the mailbox', async () => {
			const { factory, events, imap } = await connect(WATCHING);

			imap().drop();
			await settle();

			expect(factory.built).toHaveLength(2);
			expect(imap().openBox).toHaveBeenCalledWith('INBOX', expect.any(Function));
			expect(events.reconnect).toHaveBeenCalledTimes(1);
			expect(events.close).not.toHaveBeenCalled();
		});

		it('keeps the failure that caused it to itself', async () => {
			const { events, imap } = await connect(WATCHING);

			imap().drop(new Error('ECONNRESET'));
			await settle();

			expect(events.error).not.toHaveBeenCalled();
		});

		it('carries the caller handlers over to the new transport', async () => {
			const { connection, events, imap } = await connect(WATCHING);
			connection.onArrival(events.arrival);

			imap().drop();
			await settle();
			imap().emit('mail', 1);
			await settle();

			expect(events.arrival).toHaveBeenCalledWith({ count: 1 });
		});

		it('asks for a look at mail that landed while it was down', async () => {
			const { connection, events, imap } = await connect(WATCHING, (transport, attempt) => {
				if (attempt > 0) transport.mailbox = box(5);
			});
			connection.onArrival(events.arrival);

			imap().drop();
			await settle();

			// What the mailbox holds is not what arrived, so the count says nothing and the
			// caller searches for itself.
			expect(events.arrival).toHaveBeenCalledWith({ count: 'unknown' });
		});

		it('does not treat what the mailbox already held on activation as new mail', async () => {
			const { connection, events } = await connect(WATCHING, (t) => (t.mailbox = box(9)));
			connection.onArrival(events.arrival);
			await settle();

			expect(events.arrival).not.toHaveBeenCalled();
		});
	});

	describe('when an attempt fails', () => {
		it('tries again, so a server only briefly away costs the caller nothing', async () => {
			useTimers();
			const { factory, events, imap } = await connect(WATCHING, (transport, attempt) => {
				if (attempt === 1 || attempt === 2) transport.connectResult = 'close';
			});

			imap().drop();
			await settle();
			await vi.advanceTimersByTimeAsync(1000);
			await settle();
			await vi.advanceTimersByTimeAsync(2000);
			await settle();

			expect(factory.built).toHaveLength(4);
			expect(events.reconnect).toHaveBeenCalledTimes(1);
			expect(events.error).not.toHaveBeenCalled();
			expect(events.close).not.toHaveBeenCalled();
		});

		it('stops waiting to try again once the caller ends the connection', async () => {
			useTimers();
			const { connection, factory, imap } = await connect(WATCHING, (transport, attempt) => {
				if (attempt > 0) transport.connectResult = 'close';
			});

			imap().drop();
			await settle();
			expect(factory.built).toHaveLength(2);

			connection.end();
			await runOutTries();

			expect(factory.built).toHaveLength(2);
		});

		it('leaves the caller alone while it still has tries left', async () => {
			useTimers();
			const { factory, events, imap } = await connect(WATCHING, (transport, attempt) => {
				if (attempt > 0) transport.connectResult = 'close';
			});

			imap().drop();
			await settle();
			await vi.advanceTimersByTimeAsync(1000);
			await settle();

			expect(factory.built).toHaveLength(3);
			expect(events.close).not.toHaveBeenCalled();
		});
	});

	describe('when it cannot be restored', () => {
		it('spends the budget even when a fresh transport drops during its SELECT', async () => {
			useTimers();
			const { factory, events, imap } = await connect(WATCHING, (transport, attempt) => {
				// The server accepts the dial and then hangs up under the SELECT, so the drop
				// arrives on a transport that is not the one in service.
				if (attempt > 0) {
					transport.openBox.mockImplementation(() => setImmediate(() => transport.drop()));
				}
			});

			imap().drop();
			await runOutTries();

			expect(factory.built).toHaveLength(7);
			expect(events.close).toHaveBeenCalledWith('dropped', expect.any(ConnectionLostError));
		});

		it('closes as dropped, carrying the attempt that failed', async () => {
			useTimers();
			const { factory, events, imap } = await connect(WATCHING, (transport, attempt) => {
				if (attempt > 0) transport.connectResult = 'close';
			});

			imap().drop();
			await runOutTries();

			expect(factory.built).toHaveLength(7);
			expect(events.error).not.toHaveBeenCalled();
			expect(events.close).toHaveBeenCalledWith('dropped', expect.any(ConnectionClosedError));
		});

		it('gives up on an attempt that never settles', async () => {
			useTimers();
			const { events, imap } = await connect({ ...WATCHING, timeout: 1000 }, (t, attempt) => {
				if (attempt > 0) t.connectResult = 'never';
			});

			imap().drop();
			await runOutTries();

			expect(events.close).toHaveBeenCalledWith('dropped', expect.any(ConnectionTimeoutError));
		});

		it('still closes as dropped when a handler failed earlier on its own', async () => {
			useTimers();
			const { connection, events, imap } = await connect(WATCHING, (transport, attempt) => {
				if (attempt > 0) transport.connectResult = 'close';
			});
			connection.onArrival(() => {
				throw new Error('unparseable email');
			});

			imap().emit('mail', 1);
			await settle();
			expect(events.error).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'unparseable email' }),
			);

			imap().drop();
			await runOutTries();

			expect(events.close).toHaveBeenCalledWith('dropped', expect.any(ConnectionClosedError));
		});
	});

	describe('on a schedule', () => {
		it('replaces the transport every interval', async () => {
			useTimers();
			const { factory, events } = await connect({ ...WATCHING, interval: 60_000 });

			await vi.advanceTimersByTimeAsync(60_000);
			await settle();
			expect(factory.built).toHaveLength(2);

			await vi.advanceTimersByTimeAsync(60_000);
			await settle();
			expect(factory.built).toHaveLength(3);
			expect(events.close).not.toHaveBeenCalled();
		});

		it('stops once the caller ends the connection', async () => {
			useTimers();
			const { connection, factory } = await connect({ ...WATCHING, interval: 60_000 });

			connection.end();
			await vi.advanceTimersByTimeAsync(180_000);
			await settle();

			expect(factory.built).toHaveLength(1);
		});
	});

	describe('when a handler is cut short', () => {
		it('keeps the failure to itself and rescans once the mailbox is back', async () => {
			const { connection, events, imap } = await connect(WATCHING, (transport, attempt) => {
				if (attempt > 0) transport.mailbox = box(4);
			});
			imap().search.mockImplementation(() => {});
			connection.onArrival(async (arrival) => {
				events.arrival(arrival);
				await connection.search(['UNSEEN'], {});
			});

			imap().emit('mail', 1);
			await settle();
			imap().drop();
			await settle();

			expect(events.error).not.toHaveBeenCalled();
			expect(events.close).not.toHaveBeenCalled();
			expect(events.reconnect).toHaveBeenCalledTimes(1);
			expect(events.arrival).toHaveBeenNthCalledWith(2, { count: 'unknown' });
		});

		it('keeps a failure to itself when the error reaches the handler before the close', async () => {
			const { connection, events, imap } = await connect(WATCHING, (transport, attempt) => {
				if (attempt > 0) transport.mailbox = box(4);
			});
			const dropped = imap();
			dropped.search.mockImplementation((_criteria, onResults) => {
				dropped.once('error', (error: Error) => onResults(error, []));
			});
			connection.onArrival(async () => {
				await connection.search(['UNSEEN'], {});
			});

			dropped.emit('mail', 1);
			await settle();
			dropped.drop(new Error('ECONNRESET'));
			await settle();

			expect(events.error).not.toHaveBeenCalled();
			expect(events.close).not.toHaveBeenCalled();
			expect(events.reconnect).toHaveBeenCalledTimes(1);
		});

		it('rescans even with an arrival queued behind the run that was cut short', async () => {
			const arrivals: Array<number | 'unknown'> = [];
			const { connection, imap } = await connect(WATCHING, (transport, attempt) => {
				if (attempt > 0) transport.mailbox = box(4);
			});
			imap().search.mockImplementation(() => {});
			connection.onArrival(async ({ count }) => {
				arrivals.push(count);
				if (count === 1) await connection.search(['UNSEEN'], {});
			});

			imap().emit('mail', 1);
			imap().emit('mail', 2);
			await settle();
			imap().drop();
			await settle();

			expect(arrivals).toEqual([1, 'unknown']);
		});

		it('carries on serving arrivals after one was cut short', async () => {
			const arrivals: Array<number | 'unknown'> = [];
			const { connection, imap } = await connect(WATCHING, (transport, attempt) => {
				if (attempt > 0) transport.mailbox = box(4);
			});
			imap().search.mockImplementation(() => {});
			connection.onArrival(async ({ count }) => {
				arrivals.push(count);
				if (arrivals.length === 1) await connection.search(['UNSEEN'], {});
			});

			imap().emit('mail', 1);
			await settle();
			imap().drop();
			await settle();

			expect(arrivals).toEqual([1, 'unknown']);
		});

		it('carries on serving arrivals after a scheduled replacement cut one short', async () => {
			useTimers();
			const arrivals: Array<number | 'unknown'> = [];
			const { connection, imap } = await connect(
				{ ...WATCHING, interval: 60_000 },
				(transport, attempt) => {
					if (attempt > 0) transport.mailbox = box(4);
				},
			);
			imap().search.mockImplementation(() => {});
			connection.onArrival(async ({ count }) => {
				arrivals.push(count);
				if (arrivals.length === 1) await connection.search(['UNSEEN'], {});
			});

			imap().emit('mail', 1);
			await settle();
			await vi.advanceTimersByTimeAsync(60_000);
			await settle();

			expect(arrivals).toEqual([1, 'unknown']);
		});
	});

	describe('when the mailbox cannot be selected', () => {
		it('tears the transport it opened down instead of leaving it connected', async () => {
			const factory = transportFactory((t) => (t.mailbox = new Error('no such mailbox')));

			await expect(
				ImapSimple.connect(NOWHERE, { mailbox: 'Nope' }, factory.create),
			).rejects.toThrow('no such mailbox');
			await settle();

			expect(factory.latest().end).toHaveBeenCalled();
			expect(factory.built).toHaveLength(1);
		});
	});

	describe('when the first connection drops under the SELECT', () => {
		/** node-imap never answers the pending SELECT, so only the close says the transport is gone. */
		const dropUnderSelect = async () => {
			const factory = transportFactory((t) => (t.mailbox = 'never'));
			const connecting = ImapSimple.connect(NOWHERE, WATCHING, factory.create);
			await settle();
			factory.latest().drop();

			return { factory, connecting };
		};

		it('rejects instead of leaving the caller waiting on activation', async () => {
			const { connecting } = await dropUnderSelect();

			await expect(connecting).rejects.toThrow(ConnectionLostError);
		});

		it('restores nothing, because no caller is holding the connection', async () => {
			const { factory, connecting } = await dropUnderSelect();

			await expect(connecting).rejects.toThrow(ConnectionLostError);
			await settle();

			expect(factory.built).toHaveLength(1);
			expect(factory.latest().end).toHaveBeenCalled();
		});
	});

	describe('when the caller ends it', () => {
		it('does not restore a transport it tore down itself', async () => {
			const { connection, factory, events } = await connect(WATCHING);

			connection.end();
			await settle();

			expect(factory.built).toHaveLength(1);
			expect(events.reconnect).not.toHaveBeenCalled();
			expect(events.close).toHaveBeenCalledWith('ended', undefined);
		});
	});
});
