import { ImapFlow } from 'imapflow';
import { setImmediate } from 'node:timers/promises';

import { ImapSimple, toImapFlowOptions, type ImapConnectionOptions } from '../src';
import { FakeImapServer } from './fake-imap-server';

// ImapFlow does not expose its command dispatcher in its public types.
type StartupTransport = ImapFlow & {
	run: (command: string, ...args: unknown[]) => Promise<unknown>;
};

describe('IMAP connection startup', () => {
	let server: FakeImapServer;
	let options: ImapConnectionOptions;
	let client: StartupTransport;

	beforeEach(async () => {
		server = new FakeImapServer(false);
		server.supportsId = true;
		options = {
			host: '127.0.0.1',
			port: await server.listen(),
			secure: false,
			user: 'user',
			password: 'password',
			authTimeout: 5_000,
		};
		client = new ImapFlow(toImapFlowOptions(options)) as StartupTransport;
	});

	afterEach(async () => {
		client.close();
		await server.close();
	});

	it('connects when the server supports ID', async () => {
		const connection = await ImapSimple.connect(options, undefined, () => client);

		try {
			expect(client.usable).toBe(true);
			expect(client.serverInfo).toEqual({ name: 'fake IMAP', version: '1' });
			expect(server.received.map((line) => line.split(' ')[1])).toContain('ID');
		} finally {
			connection.end();
		}
	});

	it('rejects a disconnect between CAPABILITY and ID without an unhandled rejection', async () => {
		const run = client.run.bind(client);
		const dispatch = vi.spyOn(client, 'run').mockImplementation(async (command, ...args) => {
			const result = await run(command, ...args);
			// NODE-6172: Close after CAPABILITY succeeds, before startSession sends ID.
			if (command === 'CAPABILITY') client.close();
			return result;
		});
		const unhandled: unknown[] = [];
		const record = (reason: unknown) => unhandled.push(reason);
		process.on('unhandledRejection', record);

		try {
			await expect(ImapSimple.connect(options, undefined, () => client)).rejects.toMatchObject({
				message: 'Unexpected close',
				code: 'ClosedAfterConnectText',
			});
			// Let the detached session failure and its deferred close finish.
			await setImmediate();
			await setImmediate();

			expect(dispatch.mock.calls.map(([command]) => command)).toEqual(['CAPABILITY', 'ID']);
			expect(unhandled).toEqual([]);
		} finally {
			process.off('unhandledRejection', record);
			dispatch.mockRestore();
		}
	});
});
