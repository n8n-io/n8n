import { ImapSimple } from '../src';
import { FakeImapServer } from './fake-imap-server';

/**
 * The reported failure is an IMAP connection that stops responding while its
 * socket stays ESTABLISHED.
 *
 * imapflow detects this, but only because `maxIdleTime` keeps breaking IDLE:
 * an open IDLE suspends `socketTimeout`, so without it a dead connection is
 * indistinguishable from a quiet one. Detection then costs two timeouts, since
 * the first is spent on a recovery NOOP.
 *
 * Recovery needs the IDLE it interrupts to have been confirmed by the server,
 * so the connection that never gets its `+` is pinned separately — untreated,
 * it stalls forever rather than late. That case is covered by patches/imapflow.
 */

const IDLE_INTERVAL = 500;
const INACTIVITY_TIMEOUT = 1_000;

/** imapflow spends the first timeout on a recovery NOOP and reports on the second. */
const DETECTION_WINDOW = 2 * INACTIVITY_TIMEOUT;

/** These run against a real socket, and detection is two timeouts deep; 5s leaves no slack. */
const REALTIME = 20_000;

type Overrides = { socketTimeout?: number };

function useFakeServer(secure: boolean) {
	let server: FakeImapServer;
	let port: number;

	beforeEach(async () => {
		server = new FakeImapServer(secure);
		port = await server.listen();
	});

	afterEach(async () => await server.close());

	return {
		get server() {
			return server;
		},
		open: async (overrides: Overrides = {}) =>
			await ImapSimple.connect({
				host: '127.0.0.1',
				port,
				secure,
				user: 'user',
				password: 'password',
				allowUnauthorizedCerts: true,
				authTimeout: 5_000,
				maxIdleTime: IDLE_INTERVAL,
				...overrides,
			}),
	};
}

const reportsSilenceAsAnError = (fake: ReturnType<typeof useFakeServer>) => async () => {
	const connection = await fake.open({ socketTimeout: INACTIVITY_TIMEOUT });
	await connection.openBox('INBOX');

	const errored = new Promise<Error>((resolve) => connection.onError(resolve));
	fake.server.silent = true;

	expect(await errored).toMatchObject({ message: 'Socket timeout', code: 'ETIMEOUT' });
};

describe('unresponsive IMAP connection', () => {
	const fake = useFakeServer(false);

	it('completes a full connect -> openBox -> end round trip', async () => {
		const connection = await fake.open();

		await expect(connection.openBox('INBOX')).resolves.toBeDefined();
		connection.end();

		expect(fake.server.received.some((line) => line.includes('SELECT'))).toBe(true);
	});

	it('reports mail already in the mailbox on open, so a reconnect drains the backlog', async () => {
		fake.server.exists = 3;

		const connection = await fake.open();
		const arrivals: Array<number | 'unknown'> = [];
		connection.onArrival(({ count }) => {
			arrivals.push(count);
		});

		const mailbox = await connection.openBox('INBOX');
		connection.end();

		expect(mailbox.exists).toBe(3);
		// The backlog is only on the mailbox: imapflow folds the SELECT's `* 3 EXISTS` into it
		// without also emitting an `exists` event a caller would double-count.
		expect(arrivals).toEqual([]);
	});

	it('reports an error once the server stops responding', reportsSilenceAsAnError(fake), REALTIME);

	it(
		'reports an error when the server never confirms the restarted IDLE',
		async () => {
			const connection = await fake.open({ socketTimeout: INACTIVITY_TIMEOUT });
			await connection.openBox('INBOX');

			const errored = new Promise<Error>((resolve) => connection.onError(resolve));
			fake.server.withholdIdleContinuation = true;

			expect(await errored).toMatchObject({ message: 'Socket timeout', code: 'ETIMEOUT' });
		},
		REALTIME,
	);

	it(
		'closes the connection once the server stops responding',
		async () => {
			const connection = await fake.open({ socketTimeout: INACTIVITY_TIMEOUT });
			await connection.openBox('INBOX');

			const closed = new Promise<void>((resolve) => connection.onClose(() => resolve()));
			connection.onError(() => {});
			fake.server.silent = true;

			await expect(closed).resolves.toBeUndefined();
		},
		REALTIME,
	);

	it(
		'leaves a connection alone while the server keeps talking',
		async () => {
			const connection = await fake.open({ socketTimeout: INACTIVITY_TIMEOUT });
			await connection.openBox('INBOX');

			const failures: string[] = [];
			connection.onError((e: Error) => failures.push(`error: ${e.message}`));
			connection.onClose(() => failures.push('close'));

			const heartbeat = setInterval(() => fake.server.pushUntagged('* OK still here'), 400);
			// Has to outlast detection, or a connection that ignored the heartbeat
			// would not have been reported yet either.
			await new Promise((resolve) => setTimeout(resolve, DETECTION_WINDOW + 500));
			clearInterval(heartbeat);

			expect(failures).toEqual([]);
		},
		REALTIME,
	);

	it(
		'rejects a command instead of hanging when the server never answers',
		async () => {
			const connection = await fake.open({ socketTimeout: INACTIVITY_TIMEOUT });
			await connection.openBox('INBOX');
			connection.onError(() => {});

			fake.server.silent = true;

			await expect(connection.openBox('INBOX')).rejects.toThrow();
		},
		REALTIME,
	);

	it('leaves no unhandled error behind for a caller that never listens', async () => {
		const connection = await fake.open({ socketTimeout: INACTIVITY_TIMEOUT });
		await connection.list();

		let uncaught: Error | undefined;
		const record = (error: Error) => (uncaught = error);
		process.once('uncaughtException', record);

		fake.server.silent = true;
		await new Promise((resolve) => setTimeout(resolve, DETECTION_WINDOW + 500));

		process.removeListener('uncaughtException', record);
		connection.end();

		expect(uncaught).toBeUndefined();
	});
});

// TLS is the transport n8n actually runs on, and the one whose sockets are
// wrapped rather than raw. One case is enough; the rest run over plain TCP.
describe('unresponsive IMAP connection over TLS', () => {
	const fake = useFakeServer(true);

	it('reports an error once the server stops responding', reportsSilenceAsAnError(fake), REALTIME);
});
