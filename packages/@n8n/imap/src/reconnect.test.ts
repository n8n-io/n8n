import { ReconnectTimeoutError } from './errors';
import { ImapSimple, type CloseReason } from './imap-simple';
import { box, transportFactory, settle, type FakeImap } from '../test/fake-imap';

const WATCHING = { mailbox: 'INBOX' };

/** The transport settles through `setImmediate`, so only the timers under test are faked. */
const useTimers = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

afterEach(() => vi.useRealTimers());

const connect = async (
	reconnect: Parameters<typeof ImapSimple.connectWith>[1],
	init?: (transport: FakeImap, attempt: number) => void,
) => {
	const factory = transportFactory(init);
	const connection = await ImapSimple.connectWith(factory.create, reconnect);

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

		it('picks up mail that landed while it was down', async () => {
			const { connection, events, imap } = await connect(WATCHING, (transport, attempt) => {
				if (attempt > 0) transport.mailbox = box(5);
			});
			connection.onArrival(events.arrival);

			imap().drop();
			await settle();

			expect(events.arrival).toHaveBeenCalledWith({ count: 5 });
		});

		it('does not treat what the mailbox already held on activation as new mail', async () => {
			const { connection, events } = await connect(WATCHING, (t) => (t.mailbox = box(9)));
			connection.onArrival(events.arrival);
			await settle();

			expect(events.arrival).not.toHaveBeenCalled();
		});
	});

	describe('when it cannot be restored', () => {
		it('reports the failure and closes', async () => {
			const { events, imap } = await connect(WATCHING, (transport, attempt) => {
				if (attempt > 0) transport.connectResult = 'close';
			});

			imap().drop();
			await settle();

			expect(events.error).toHaveBeenCalledTimes(1);
			expect(events.close).toHaveBeenCalledWith('error');
		});

		it('gives up on an attempt that never settles', async () => {
			useTimers();
			const { events, imap } = await connect({ ...WATCHING, timeout: 1000 }, (t, attempt) => {
				if (attempt > 0) t.connectResult = 'never';
			});

			imap().drop();
			await vi.advanceTimersByTimeAsync(1000);
			await settle();

			expect(events.error).toHaveBeenCalledWith(expect.any(ReconnectTimeoutError));
			expect(events.close).toHaveBeenCalledWith('error');
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

	describe('when the caller ends it', () => {
		it('does not restore a transport it tore down itself', async () => {
			const { connection, factory, events } = await connect(WATCHING);

			connection.end();
			await settle();

			expect(factory.built).toHaveLength(1);
			expect(events.reconnect).not.toHaveBeenCalled();
			expect(events.close).toHaveBeenCalledWith('ended');
		});
	});
});
