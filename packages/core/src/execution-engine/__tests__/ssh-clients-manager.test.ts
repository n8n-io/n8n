import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { SSHCredentials } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { Client, Server, utils } from 'ssh2';
import { mock } from 'vitest-mock-extended';

import { SSHClientsConfig, SSHClientsManager } from '../ssh-clients-manager';

const idleTimeout = 5 * 60;
const cleanUpInterval = 60;
const credentials: SSHCredentials = {
	sshAuthenticateWith: 'password',
	sshHost: 'example.com',
	sshPort: 22,
	sshUser: 'username',
	sshPassword: 'password',
};

let sshClientsManager: SSHClientsManager;
let connectSpy = vi.spyOn(Client.prototype, 'connect');
let endSpy = vi.spyOn(Client.prototype, 'end');

beforeEach(() => {
	vi.clearAllMocks();

	connectSpy = vi.spyOn(Client.prototype, 'connect');
	endSpy = vi.spyOn(Client.prototype, 'end');

	sshClientsManager = new SSHClientsManager(
		mock({ idleTimeout }),
		mock<Logger>({ scoped: () => mock<Logger>() }),
	);
	connectSpy.mockImplementation(function (this: Client) {
		this.emit('ready');
		return this;
	});
});

afterEach(() => {
	sshClientsManager.onShutdown();
});

it('should not keep the process alive for the stale-connection cleanup timer', () => {
	const { cleanupTimer } = sshClientsManager as unknown as { cleanupTimer: NodeJS.Timeout };

	expect(cleanupTimer.hasRef()).toBe(false);
});

describe('getClient', () => {
	it('should create a new SSH client', async () => {
		const client = await sshClientsManager.getClient(credentials);

		expect(client).toBeInstanceOf(Client);
	});

	it('should not create a new SSH client when connect fails', async () => {
		connectSpy.mockImplementation(function (this: Client) {
			throw new Error('Failed to connect');
		});
		await expect(sshClientsManager.getClient(credentials)).rejects.toThrow('Failed to connect');
	});

	it('should reuse an existing SSH client', async () => {
		const client1 = await sshClientsManager.getClient(credentials);
		const client2 = await sshClientsManager.getClient(credentials);

		expect(client1).toBe(client2);
	});

	it('should not create multiple clients for the same credentials in parallel', async () => {
		// ARRANGE
		connectSpy.mockImplementation(function (this: Client) {
			setTimeout(() => this.emit('ready'), Math.random() * 10);
			return this;
		});

		// ACT
		const clients = await Promise.all([
			sshClientsManager.getClient(credentials),
			sshClientsManager.getClient(credentials),
			sshClientsManager.getClient(credentials),
			sshClientsManager.getClient(credentials),
			sshClientsManager.getClient(credentials),
			sshClientsManager.getClient(credentials),
		]);

		// ASSERT
		// returns the same client for all invocations
		const ogClient = await sshClientsManager.getClient(credentials);
		expect(clients).toHaveLength(6);
		for (const client of clients) {
			expect(client).toBe(ogClient);
		}
		expect(connectSpy).toHaveBeenCalledTimes(1);
	});
});

describe('host key verification', () => {
	const hostKey = Buffer.from('host-key');
	const fingerprint = `SHA256:${createHash('sha256').update(hostKey).digest('base64').replace(/=+$/, '')}`;

	const getHostVerifier = () => {
		const config = connectSpy.mock.calls[0][0];
		return config.hostVerifier as ((key: Buffer) => boolean) | undefined;
	};

	it('should not verify the host key when no fingerprint is set', async () => {
		await sshClientsManager.getClient(credentials);

		expect(getHostVerifier()).toBeUndefined();
	});

	it('should not verify the host key when the fingerprint is empty', async () => {
		await sshClientsManager.getClient({ ...credentials, sshHostKeyFingerprint: '  ' });

		expect(getHostVerifier()).toBeUndefined();
	});

	it('should accept a host key that matches the fingerprint', async () => {
		await sshClientsManager.getClient({ ...credentials, sshHostKeyFingerprint: fingerprint });

		expect(getHostVerifier()?.(hostKey)).toBe(true);
	});

	it.each([
		['without the SHA256: prefix', fingerprint.replace('SHA256:', '')],
		['with base64 padding', `${fingerprint}=`],
		['with surrounding whitespace', ` ${fingerprint}\n`],
	])('should accept a matching fingerprint %s', async (_, value) => {
		await sshClientsManager.getClient({ ...credentials, sshHostKeyFingerprint: value });

		expect(getHostVerifier()?.(hostKey)).toBe(true);
	});

	it('should reject a host key that does not match the fingerprint', async () => {
		await sshClientsManager.getClient({ ...credentials, sshHostKeyFingerprint: fingerprint });

		expect(getHostVerifier()?.(Buffer.from('other-host-key'))).toBe(false);
	});

	it.each(['SHA256:', 'sha256:', '=', 'SHA256:=='])(
		'should reject every host key when the fingerprint is `%s`',
		async (value) => {
			await sshClientsManager.getClient({ ...credentials, sshHostKeyFingerprint: value });

			expect(getHostVerifier()?.(hostKey)).toBe(false);
		},
	);

	it('should not reuse a client across different fingerprints', async () => {
		const client1 = await sshClientsManager.getClient(credentials);
		const client2 = await sshClientsManager.getClient({
			...credentials,
			sshHostKeyFingerprint: fingerprint,
		});

		expect(client1).not.toBe(client2);
		expect(connectSpy).toHaveBeenCalledTimes(2);
	});

	describe('against a real SSH server', () => {
		let server: Server;
		let port: number;
		let serverFingerprint: string;

		beforeEach(async () => {
			connectSpy.mockRestore();

			const keys = utils.generateKeyPairSync('ed25519');
			const publicKey = utils.parseKey(keys.public);
			if (publicKey instanceof Error) throw publicKey;
			serverFingerprint = `SHA256:${createHash('sha256').update(publicKey.getPublicSSH()).digest('base64')}`;

			server = new Server({ hostKeys: [keys.private] }, (client) => {
				client.on('authentication', (ctx) => ctx.accept());
				client.on('error', () => {});
			});
			await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
			port = (server.address() as AddressInfo).port;
		});

		afterEach(async () => {
			sshClientsManager.onShutdown();
			await new Promise((resolve) => server.close(resolve));
		});

		it('should connect when the fingerprint matches', async () => {
			const client = await sshClientsManager.getClient({
				...credentials,
				sshHost: '127.0.0.1',
				sshPort: port,
				sshHostKeyFingerprint: serverFingerprint,
			});

			expect(client).toBeInstanceOf(Client);
		});

		it('should fail to connect when the fingerprint does not match', async () => {
			await expect(
				sshClientsManager.getClient({
					...credentials,
					sshHost: '127.0.0.1',
					sshPort: port,
					sshHostKeyFingerprint: fingerprint,
				}),
			).rejects.toThrow('Host denied (verification failed)');
			expect(sshClientsManager.clients.size).toBe(0);
		});
	});
});

describe('onShutdown', () => {
	it('should close all SSH connections when onShutdown is called', async () => {
		await sshClientsManager.getClient(credentials);
		sshClientsManager.onShutdown();

		expect(endSpy).toHaveBeenCalledTimes(1);
	});

	it('should close all SSH connections on process exit', async () => {
		// ARRANGE
		await sshClientsManager.getClient(credentials);

		// ACT
		// @ts-expect-error we're not supposed to emit `exit` so it's missing from
		// the type definition
		process.emit('exit');

		// ASSERT
		expect(endSpy).toHaveBeenCalledTimes(1);
	});

	it('should not throw on process exit when constructed without a logger', () => {
		// ARRANGE
		const managerWithoutLogger = new SSHClientsManager(
			mock({ idleTimeout }),
			undefined as unknown as Logger,
		);

		// ACT & ASSERT
		expect(() => managerWithoutLogger.onShutdown()).not.toThrow();
	});

	it('should deregister its exit handler on shutdown', async () => {
		// ARRANGE
		const before = process.listenerCount('exit');
		const manager = new SSHClientsManager(
			mock({ idleTimeout }),
			mock<Logger>({ scoped: () => mock<Logger>() }),
		);
		expect(process.listenerCount('exit')).toBe(before + 1);

		// ACT
		manager.onShutdown();

		// ASSERT
		expect(process.listenerCount('exit')).toBe(before);
	});
});

describe('cleanup', () => {
	beforeEach(async () => {
		vi.useFakeTimers();
		sshClientsManager = new SSHClientsManager(
			mock({ idleTimeout }),
			mock<Logger>({ scoped: () => mock<Logger>() }),
		);
	});

	it('should cleanup stale SSH connections', async () => {
		await sshClientsManager.getClient({ ...credentials, sshHost: 'host1' });
		await sshClientsManager.getClient({ ...credentials, sshHost: 'host2' });
		await sshClientsManager.getClient({ ...credentials, sshHost: 'host3' });

		vi.advanceTimersByTime((idleTimeout + cleanUpInterval + 1) * 1000);

		expect(endSpy).toHaveBeenCalledTimes(3);
		expect(sshClientsManager.clients.size).toBe(0);
	});

	describe('updateLastUsed', () => {
		test('updates lastUsed in the registration', async () => {
			// ARRANGE
			const client = await sshClientsManager.getClient(credentials);
			// schedule client for clean up soon
			vi.advanceTimersByTime((idleTimeout - 1) * 1000);

			// ACT 1
			// updating lastUsed should prevent the clean up
			sshClientsManager.updateLastUsed(client);
			vi.advanceTimersByTime(idleTimeout * 1000);

			// ASSERT 1
			expect(endSpy).toHaveBeenCalledTimes(0);

			// ACT 1
			vi.advanceTimersByTime(cleanUpInterval * 1000);

			// ASSERT 1
			expect(endSpy).toHaveBeenCalledTimes(1);
		});
	});
});

describe('abort controller', () => {
	test('call `abort` when the client emits `error`', async () => {
		// ARRANGE
		const abortController = new AbortController();
		const client = await sshClientsManager.getClient(credentials, abortController);

		// ACT 1
		client.emit('error', new Error());

		// ASSERT 1
		expect(abortController.signal.aborted).toBe(true);
		expect(endSpy).toHaveBeenCalledTimes(1);
	});

	test('call `abort` when the client emits `end`', async () => {
		// ARRANGE
		const abortController = new AbortController();
		const client = await sshClientsManager.getClient(credentials, abortController);

		// ACT 1
		client.emit('end');

		// ASSERT 1
		expect(abortController.signal.aborted).toBe(true);
		expect(endSpy).toHaveBeenCalledTimes(1);
	});

	test('call `abort` when the client emits `close`', async () => {
		// ARRANGE
		const abortController = new AbortController();
		const client = await sshClientsManager.getClient(credentials, abortController);

		// ACT 1
		client.emit('close');

		// ASSERT 1
		expect(abortController.signal.aborted).toBe(true);
		expect(endSpy).toHaveBeenCalledTimes(1);
	});

	test('closes client when `abort` is being called', async () => {
		// ARRANGE
		const abortController = new AbortController();
		await sshClientsManager.getClient(credentials, abortController);

		// ACT 1
		abortController.abort();

		// ASSERT 1
		expect(endSpy).toHaveBeenCalledTimes(1);
	});

	test('does not close a shared client while another caller still uses it', async () => {
		// ARRANGE
		const firstAbortController = new AbortController();
		const secondAbortController = new AbortController();
		await sshClientsManager.getClient(credentials, firstAbortController);
		await sshClientsManager.getClient(credentials, secondAbortController);

		// ACT 1
		firstAbortController.abort();

		// ASSERT 1
		expect(endSpy).not.toHaveBeenCalled();
		expect(secondAbortController.signal.aborted).toBe(false);
	});

	test('closes a shared client once every caller has aborted', async () => {
		// ARRANGE
		const firstAbortController = new AbortController();
		const secondAbortController = new AbortController();
		await sshClientsManager.getClient(credentials, firstAbortController);
		await sshClientsManager.getClient(credentials, secondAbortController);

		// ACT 1
		firstAbortController.abort();
		secondAbortController.abort();

		// ASSERT 1
		expect(endSpy).toHaveBeenCalledTimes(1);
	});

	test('aborts every caller when a shared client closes', async () => {
		// ARRANGE
		const firstAbortController = new AbortController();
		const secondAbortController = new AbortController();
		const client = await sshClientsManager.getClient(credentials, firstAbortController);
		await sshClientsManager.getClient(credentials, secondAbortController);

		// ACT 1
		client.emit('close');

		// ASSERT 1
		expect(firstAbortController.signal.aborted).toBe(true);
		expect(secondAbortController.signal.aborted).toBe(true);
		expect(endSpy).toHaveBeenCalledTimes(1);
	});
});

describe('SSHClientsConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	test('allows overriding the default idle timeout', async () => {
		// ARRANGE
		process.env.N8N_SSH_TUNNEL_IDLE_TIMEOUT = '5';

		// ACT
		const config = Container.get(SSHClientsConfig);

		// ASSERT
		expect(config.idleTimeout).toBe(5);
	});

	test.each(['-5', '0', 'foo'])(
		'fall back to default if N8N_SSH_TUNNEL_IDLE_TIMEOUT is `%s`',
		async (value) => {
			// ARRANGE
			process.env.N8N_SSH_TUNNEL_IDLE_TIMEOUT = value;

			// ACT
			const config = Container.get(SSHClientsConfig);

			// ASSERT
			expect(config.idleTimeout).toBe(300);
		},
	);
});
