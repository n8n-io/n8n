import { EventEmitter } from 'events';

import type { ImapConnectionOptions } from './connection-options';
import { ImapSimple, type ImapTransport } from './imap-simple';

/** A fake transport never dials, but `connect` still wants somewhere to point. */
const NOWHERE: ImapConnectionOptions = {
	host: 'imap.test',
	port: 993,
	secure: true,
	user: 'user',
	password: 'password',
};

const RECONNECT_TIMEOUT = 45_000;
const REPLACE_INTERVAL = 5 * 60 * 1000;

/** What `restore` waits out across its six tries: 1 + 2 + 4 + 8 + 16 seconds of backoff. */
const ALL_BACKOFF = 31_000;

class FakeTransport extends EventEmitter {
	usable = true;

	connect = vi.fn().mockResolvedValue(undefined);

	mailboxOpen = vi.fn().mockResolvedValue({ exists: 0 });

	logout = vi.fn().mockResolvedValue(true);

	close = vi.fn();
}

const neverSettles = async <T>(): Promise<T> => await new Promise<T>(() => {});

const openWatching = async (
	createTransport: () => ImapTransport,
	overrides: { interval?: number } = {},
) =>
	await ImapSimple.connect(
		NOWHERE,
		{
			mailbox: 'INBOX',
			timeout: RECONNECT_TIMEOUT,
			...overrides,
		},
		createTransport,
	);

/** Hands out each transport in turn, reusing the last once the list runs out. */
const handOut = (...transports: FakeTransport[]) => {
	let index = 0;
	return () => transports[Math.min(index++, transports.length - 1)] as unknown as ImapTransport;
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('reconnecting', () => {
	it('restores itself when the transport drops', async () => {
		const [first, second] = [new FakeTransport(), new FakeTransport()];
		const onClose = vi.fn();
		const onReconnect = vi.fn();

		const connection = await openWatching(handOut(first, second));
		connection.onClose(onClose).onReconnect(onReconnect);

		first.emit('close');
		await vi.advanceTimersByTimeAsync(1);

		expect(onReconnect).toHaveBeenCalledTimes(1);
		expect(second.mailboxOpen).toHaveBeenCalledWith('INBOX');
		expect(onClose).not.toHaveBeenCalled();
	});

	it('keeps the same connection, so a handler registered once still runs', async () => {
		const [first, second] = [new FakeTransport(), new FakeTransport()];
		const onArrival = vi.fn().mockResolvedValue(undefined);

		const connection = await openWatching(handOut(first, second));
		connection.onArrival(onArrival);

		first.emit('close');
		await vi.advanceTimersByTimeAsync(1);
		second.emit('exists', { path: 'INBOX', count: 2, prevCount: 1 });
		await vi.advanceTimersByTimeAsync(1);

		expect(onArrival).toHaveBeenCalledWith({ count: 1 });
	});

	it('has the caller look at the mailbox again after a reconnect', async () => {
		const [first, second] = [new FakeTransport(), new FakeTransport()];
		second.mailboxOpen.mockResolvedValue({ exists: 4 });
		const onArrival = vi.fn().mockResolvedValue(undefined);

		const connection = await openWatching(handOut(first, second));
		connection.onArrival(onArrival);

		first.emit('close');
		await vi.advanceTimersByTimeAsync(1);

		expect(onArrival).toHaveBeenCalledTimes(1);
	});

	it('leaves what the mailbox already held alone on the first connection', async () => {
		const first = new FakeTransport();
		first.mailboxOpen.mockResolvedValue({ exists: 4 });
		const onArrival = vi.fn().mockResolvedValue(undefined);

		const connection = await openWatching(handOut(first));
		connection.onArrival(onArrival);
		await vi.advanceTimersByTimeAsync(1);

		expect(onArrival).not.toHaveBeenCalled();
	});

	it('does not let a stale attempt tear down the transport that won', async () => {
		const [first, second, third] = [new FakeTransport(), new FakeTransport(), new FakeTransport()];
		let releaseSelect!: () => void;
		second.mailboxOpen.mockReturnValue(
			new Promise((resolve) => {
				releaseSelect = () => resolve({ exists: 0 });
			}),
		);
		const onArrival = vi.fn().mockResolvedValue(undefined);

		const connection = await openWatching(handOut(first, second, third));
		connection.onArrival(onArrival);

		first.emit('close');
		// The dial into `second` hangs on its SELECT until the attempt times out; the retry wins.
		await vi.advanceTimersByTimeAsync(RECONNECT_TIMEOUT + 1001);
		releaseSelect();
		await vi.advanceTimersByTimeAsync(1);

		third.emit('exists', { path: 'INBOX', count: 2, prevCount: 1 });
		await vi.advanceTimersByTimeAsync(1);

		expect(second.close).toHaveBeenCalled();
		expect(third.close).not.toHaveBeenCalled();
		expect(onArrival).toHaveBeenCalledWith({ count: 1 });
	});

	it('lets an error from a superseded dial cut nothing short on the transport that won', async () => {
		const [first, second, third] = [new FakeTransport(), new FakeTransport(), new FakeTransport()];
		second.mailboxOpen.mockReturnValue(neverSettles());
		const onArrival = vi.fn().mockResolvedValue(undefined);
		const onError = vi.fn();

		const connection = await openWatching(handOut(first, second, third));
		connection.onArrival(onArrival).onError(onError);

		first.emit('close');
		// The dial into `second` hangs on its SELECT until the attempt times out; the retry wins.
		await vi.advanceTimersByTimeAsync(RECONNECT_TIMEOUT + 1001);

		third.emit('exists', { path: 'INBOX', count: 2, prevCount: 1 });
		second.emit('error', new Error('read ECONNRESET'));
		await vi.advanceTimersByTimeAsync(1);

		expect(onArrival).toHaveBeenCalledWith({ count: 1 });
		expect(onError).not.toHaveBeenCalled();
	});

	it('fails to connect when the first transport drops before it is in place', async () => {
		const first = new FakeTransport();
		let releaseSelect!: () => void;
		first.mailboxOpen.mockReturnValue(
			new Promise((resolve) => {
				releaseSelect = () => resolve({ exists: 0 });
			}),
		);
		const createTransport = vi.fn(() => first as unknown as ImapTransport);

		const connecting = expect(openWatching(createTransport)).rejects.toThrow(
			'Connection to the IMAP server was lost',
		);

		await vi.advanceTimersByTimeAsync(1);
		first.emit('close');
		await vi.advanceTimersByTimeAsync(1);
		releaseSelect();

		await connecting;
		// A connection nobody holds is not restored behind the caller's back.
		await vi.advanceTimersByTimeAsync(ALL_BACKOFF);
		expect(createTransport).toHaveBeenCalledTimes(1);
		expect(first.close).toHaveBeenCalled();
	});

	it('tears down a transport whose first SELECT failed', async () => {
		const first = new FakeTransport();
		first.mailboxOpen.mockRejectedValue(new Error("NO Mailbox doesn't exist"));

		await expect(openWatching(handOut(first))).rejects.toThrow("Mailbox doesn't exist");

		expect(first.close).toHaveBeenCalled();
		expect(first.listenerCount('close')).toBe(0);
	});

	it('tears down a transport whose SELECT failed on the way back', async () => {
		const [first, second] = [new FakeTransport(), new FakeTransport()];
		second.mailboxOpen.mockRejectedValue(new Error("NO Mailbox doesn't exist"));
		const onClose = vi.fn();

		const connection = await openWatching(handOut(first, second));
		connection.onClose(onClose);

		first.emit('close');
		await vi.advanceTimersByTimeAsync(ALL_BACKOFF);

		expect(second.close).toHaveBeenCalled();
		const [reason, cause] = onClose.mock.calls[0] as [string, Error];
		expect(reason).toBe('dropped');
		expect(cause.message).toContain("Mailbox doesn't exist");
	});

	it('does not report the errors it recovers from', async () => {
		const [first, second] = [new FakeTransport(), new FakeTransport()];
		const onError = vi.fn();

		const connection = await openWatching(handOut(first, second));
		connection.onError(onError);

		first.emit('error', new Error('read ECONNRESET'));
		first.emit('close');
		await vi.advanceTimersByTimeAsync(1);

		expect(onError).not.toHaveBeenCalled();
	});

	it('closes as dropped when it cannot get back, carrying the attempt that failed', async () => {
		const first = new FakeTransport();
		const onError = vi.fn();
		const onClose = vi.fn();
		let handedOutFirst = false;

		const connection = await openWatching(() => {
			if (handedOutFirst) throw new Error('getaddrinfo ENOTFOUND imap.test.com');
			handedOutFirst = true;
			return first as unknown as ImapTransport;
		});
		connection.onError(onError).onClose(onClose);

		first.emit('close');
		await vi.advanceTimersByTimeAsync(ALL_BACKOFF);

		expect(onError).not.toHaveBeenCalled();
		const [reason, cause] = onClose.mock.calls[0] as [string, Error];
		expect(reason).toBe('dropped');
		expect(cause.message).toContain('ENOTFOUND');
	});

	it('tries again, so a server that is only briefly away costs the caller nothing', async () => {
		const first = new FakeTransport();
		const onClose = vi.fn();
		const onReconnect = vi.fn();
		let attempts = 0;

		const connection = await openWatching(() => {
			attempts++;
			if (attempts === 1) return first as unknown as ImapTransport;
			if (attempts <= 3) throw new Error('ECONNREFUSED');
			return new FakeTransport() as unknown as ImapTransport;
		});
		connection.onClose(onClose).onReconnect(onReconnect);

		first.emit('close');
		// The first try fails outright, the second after 1s of backoff, the third comes back.
		await vi.advanceTimersByTimeAsync(3000);

		expect(attempts).toBe(4);
		expect(onReconnect).toHaveBeenCalledTimes(1);
		expect(onClose).not.toHaveBeenCalled();
	});

	it('stops waiting to try again once the caller ends the connection', async () => {
		const first = new FakeTransport();
		const onClose = vi.fn();
		let attempts = 0;

		const connection = await openWatching(() => {
			attempts++;
			if (attempts === 1) return first as unknown as ImapTransport;
			throw new Error('still down');
		});
		connection.onClose(onClose);

		first.emit('close');
		await vi.advanceTimersByTimeAsync(1);
		expect(attempts).toBe(2);

		connection.end();
		await vi.advanceTimersByTimeAsync(ALL_BACKOFF);

		expect(attempts).toBe(2);
		expect(onClose).toHaveBeenCalledExactlyOnceWith('ended', undefined);
	});

	it('spends the budget even when a fresh transport drops during its SELECT', async () => {
		const first = new FakeTransport();
		const onClose = vi.fn();
		let attempts = 0;

		const connection = await openWatching(() => {
			attempts++;
			if (attempts === 1) return first as unknown as ImapTransport;
			// The server accepts the dial and then hangs up under the SELECT: the close lands on
			// a transport that is not the one in service, and the driver rejects the command.
			const dropped = new FakeTransport();
			dropped.mailboxOpen.mockImplementation(async () => {
				dropped.emit('close');
				return await Promise.reject(new Error('Connection not available'));
			});
			return dropped as unknown as ImapTransport;
		});
		connection.onError(vi.fn()).onClose(onClose);

		first.emit('close');
		await vi.advanceTimersByTimeAsync(ALL_BACKOFF);

		expect(attempts).toBe(1 + 6);
		expect(onClose).toHaveBeenCalledExactlyOnceWith(
			'dropped',
			expect.objectContaining({ message: 'Connection not available' }),
		);
	});

	it('gives up on an attempt that outlives the timeout', async () => {
		const first = new FakeTransport();
		const onError = vi.fn();
		const onClose = vi.fn();
		let handedOutFirst = false;

		const connection = await openWatching(() => {
			if (handedOutFirst) return { connect: neverSettles } as unknown as ImapTransport;
			handedOutFirst = true;
			return first as unknown as ImapTransport;
		});
		connection.onError(onError).onClose(onClose);

		first.emit('close');
		await vi.advanceTimersByTimeAsync(6 * RECONNECT_TIMEOUT + ALL_BACKOFF + 1);

		expect(onError).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledWith(
			'dropped',
			expect.objectContaining({ message: 'Reconnecting to the IMAP server timed out' }),
		);
	});

	it('stays silent once it has closed for good', async () => {
		const first = new FakeTransport();
		const onClose = vi.fn();
		let handedOutFirst = false;

		const connection = await openWatching(() => {
			if (handedOutFirst) throw new Error('still down');
			handedOutFirst = true;
			return first as unknown as ImapTransport;
		});
		connection.onClose(onClose);

		first.emit('close');
		await vi.advanceTimersByTimeAsync(ALL_BACKOFF);
		first.emit('close');
		await vi.advanceTimersByTimeAsync(1);

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('does not try to restore a connection the caller ended', async () => {
		const [first, second] = [new FakeTransport(), new FakeTransport()];
		const onClose = vi.fn();

		const connection = await openWatching(handOut(first, second));
		connection.onClose(onClose);

		connection.end();
		first.emit('close');
		await vi.advanceTimersByTimeAsync(1);

		expect(onClose).toHaveBeenCalledWith('ended', undefined);
		expect(second.connect).not.toHaveBeenCalled();
	});

	describe('when a handler is cut short', () => {
		it('keeps the failure to itself when the error reaches the handler before the close', async () => {
			const [first, second] = [new FakeTransport(), new FakeTransport()];
			const onError = vi.fn();
			const onReconnect = vi.fn();
			const connection = await openWatching(handOut(first, second));
			connection.onError(onError).onReconnect(onReconnect);
			connection.onArrival(
				async () =>
					await new Promise((_, reject) =>
						first.once('error', () => reject(new Error('ECONNRESET'))),
					),
			);

			first.emit('exists', { path: 'INBOX', count: 1, prevCount: 0 });
			await vi.advanceTimersByTimeAsync(1);
			first.emit('error', new Error('ECONNRESET'));
			first.emit('close');
			await vi.advanceTimersByTimeAsync(1);

			expect(onError).not.toHaveBeenCalled();
			expect(onReconnect).toHaveBeenCalledTimes(1);
		});

		it('holds the rescan back until the run a drop cut short has finished', async () => {
			const [first, second] = [new FakeTransport(), new FakeTransport()];
			const trail: string[] = [];
			let runs = 0;
			let release: () => void = () => {};

			const connection = await openWatching(handOut(first, second));
			connection.onArrival(async () => {
				const run = ++runs;
				trail.push(`start:${run}`);
				if (run === 1) await new Promise<void>((resolve) => (release = resolve));
				trail.push(`end:${run}`);
			});

			first.emit('exists', { path: 'INBOX', count: 1, prevCount: 0 });
			await vi.advanceTimersByTimeAsync(1);
			first.emit('close');
			await vi.advanceTimersByTimeAsync(1);

			expect(trail).toEqual(['start:1']);

			release();
			await vi.advanceTimersByTimeAsync(1);

			expect(trail).toEqual(['start:1', 'end:1', 'start:2', 'end:2']);
		});

		it('reports a failure that belongs to the transport now in place', async () => {
			const [first, second] = [new FakeTransport(), new FakeTransport()];
			const onError = vi.fn();
			const connection = await openWatching(handOut(first, second));
			connection.onError(onError);
			connection.onArrival(() => {
				throw new Error('rescan blew up');
			});

			first.emit('close');
			await vi.advanceTimersByTimeAsync(1);

			expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'rescan blew up' }));
		});
	});

	describe('catchUp', () => {
		it('has the caller look at the mailbox', async () => {
			const onArrival = vi.fn().mockResolvedValue(undefined);
			const connection = await openWatching(handOut(new FakeTransport()));
			connection.onArrival(onArrival);

			connection.catchUp();
			await vi.advanceTimersByTimeAsync(1);

			expect(onArrival).toHaveBeenCalledTimes(1);
		});

		it('waits for a handler that is already running', async () => {
			let running = 0;
			let overlapped = false;
			const transport = new FakeTransport();
			const connection = await openWatching(handOut(transport));
			connection.onArrival(async () => {
				running += 1;
				if (running > 1) overlapped = true;
				await new Promise((resolve) => setTimeout(resolve, 100));
				running -= 1;
			});

			transport.emit('exists', { path: 'INBOX', count: 2, prevCount: 1 });
			connection.catchUp();
			await vi.advanceTimersByTimeAsync(500);

			expect(overlapped).toBe(false);
		});

		it('holds the request until a handler is registered', async () => {
			const onArrival = vi.fn().mockResolvedValue(undefined);
			const connection = await openWatching(handOut(new FakeTransport()));

			connection.catchUp();
			await vi.advanceTimersByTimeAsync(1);
			connection.onArrival(onArrival);
			await vi.advanceTimersByTimeAsync(1);

			expect(onArrival).toHaveBeenCalledTimes(1);
		});

		it('stays silent once the connection is spent', async () => {
			const onArrival = vi.fn().mockResolvedValue(undefined);
			const connection = await openWatching(handOut(new FakeTransport()));
			connection.onArrival(onArrival);

			connection.end();
			connection.catchUp();
			await vi.advanceTimersByTimeAsync(1);

			expect(onArrival).not.toHaveBeenCalled();
		});

		it('still closes as dropped when a handler failed earlier on its own', async () => {
			const first = new FakeTransport();
			const onError = vi.fn();
			const onClose = vi.fn();
			let handedOutFirst = false;

			const connection = await openWatching(() => {
				if (handedOutFirst) throw new Error('getaddrinfo ENOTFOUND imap.test.com');
				handedOutFirst = true;
				return first as unknown as ImapTransport;
			});
			connection.onError(onError).onClose(onClose);
			connection.onArrival(() => {
				throw new Error('unparseable email');
			});

			first.emit('exists', { path: 'INBOX', count: 1, prevCount: 0 });
			await vi.advanceTimersByTimeAsync(1);
			expect(onError).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'unparseable email' }),
			);

			first.emit('close');
			await vi.advanceTimersByTimeAsync(ALL_BACKOFF);

			expect(onClose).toHaveBeenCalledWith('dropped', expect.any(Error));
		});
	});

	describe('on a schedule', () => {
		it('replaces the transport on the interval', async () => {
			const [first, second] = [new FakeTransport(), new FakeTransport()];
			const onReconnect = vi.fn();

			const connection = await openWatching(handOut(first, second), {
				interval: REPLACE_INTERVAL,
			});
			connection.onReconnect(onReconnect);

			await vi.advanceTimersByTimeAsync(REPLACE_INTERVAL + 1);

			expect(first.close).toHaveBeenCalled();
			expect(onReconnect).toHaveBeenCalledTimes(1);
			expect(second.mailboxOpen).toHaveBeenCalledWith('INBOX');
		});

		it('does not let a slow replace stack up behind the next tick', async () => {
			// A replace that outlasts its own interval; a naive interval timer would double up.
			const TICK = 10_000;
			const REPLACE_DURATION = 3 * TICK;
			const startedAt: number[] = [];
			const createTransport = vi.fn(() => {
				const transport = new FakeTransport();
				// The first connect must settle without the clock being driven, so only the
				// replacements are slow.
				if (startedAt.length > 0) {
					transport.connect.mockImplementation(
						async () => await new Promise((resolve) => setTimeout(resolve, REPLACE_DURATION)),
					);
				}
				startedAt.push(Date.now());
				return transport as unknown as ImapTransport;
			});

			await ImapSimple.connect(
				NOWHERE,
				{
					mailbox: 'INBOX',
					interval: TICK,
					timeout: 10 * REPLACE_DURATION,
				},
				createTransport,
			);
			await vi.advanceTimersByTimeAsync(10 * TICK);

			expect(startedAt.length).toBeGreaterThan(2);
			// The first gap is just the tick; every later one waits out the replace before it.
			for (let i = 2; i < startedAt.length; i++) {
				expect(startedAt[i] - startedAt[i - 1]).toBeGreaterThanOrEqual(TICK + REPLACE_DURATION);
			}
		});

		it('closes instead of piling attempts up when a scheduled replace hangs', async () => {
			const first = new FakeTransport();
			const onError = vi.fn();
			const onClose = vi.fn();
			let attempts = 0;
			const createTransport = vi.fn(() => {
				if (attempts++ === 0) return first as unknown as ImapTransport;
				return { connect: neverSettles } as unknown as ImapTransport;
			});

			const connection = await ImapSimple.connect(
				NOWHERE,
				{
					mailbox: 'INBOX',
					interval: REPLACE_INTERVAL,
					timeout: RECONNECT_TIMEOUT,
				},
				createTransport,
			);
			connection.onError(onError).onClose(onClose);

			await vi.advanceTimersByTimeAsync(REPLACE_INTERVAL + 6 * RECONNECT_TIMEOUT + ALL_BACKOFF + 1);

			expect(onError).not.toHaveBeenCalled();
			expect(onClose).toHaveBeenCalledExactlyOnceWith('dropped', expect.any(Error));
			expect(createTransport).toHaveBeenCalledTimes(1 + 6);
		});

		it('stops replacing once a drop it could not recover from closed it', async () => {
			const first = new FakeTransport();
			let attempts = 0;
			const createTransport = vi.fn(() => {
				if (attempts++ === 0) return first as unknown as ImapTransport;
				throw new Error('still down');
			});

			const connection = await ImapSimple.connect(
				NOWHERE,
				{
					mailbox: 'INBOX',
					interval: REPLACE_INTERVAL,
					timeout: RECONNECT_TIMEOUT,
				},
				createTransport,
			);
			connection.onError(vi.fn()).onClose(vi.fn());

			first.emit('close');
			await vi.advanceTimersByTimeAsync(REPLACE_INTERVAL * 3);

			expect(createTransport).toHaveBeenCalledTimes(1 + 6);
		});

		it('stops replacing once the caller ends it', async () => {
			const transport = new FakeTransport();
			const createTransport = vi.fn(() => transport as unknown as ImapTransport);

			const connection = await ImapSimple.connect(
				NOWHERE,
				{
					mailbox: 'INBOX',
					interval: REPLACE_INTERVAL,
				},
				createTransport,
			);
			connection.end();
			await vi.advanceTimersByTimeAsync(REPLACE_INTERVAL * 3);

			expect(createTransport).toHaveBeenCalledTimes(1);
		});
	});
});
