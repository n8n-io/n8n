import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { SSHCredentials } from 'n8n-workflow';
import { Client } from 'ssh2';

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
const connectSpy = jest.spyOn(Client.prototype, 'connect');
const endSpy = jest.spyOn(Client.prototype, 'end');

beforeEach(() => {
	jest.clearAllMocks();

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
});

describe('cleanup', () => {
	beforeEach(async () => {
		jest.useFakeTimers();
		sshClientsManager = new SSHClientsManager(
			mock({ idleTimeout }),
			mock<Logger>({ scoped: () => mock<Logger>() }),
		);
	});

	it('should cleanup stale SSH connections', async () => {
		await sshClientsManager.getClient({ ...credentials, sshHost: 'host1' });
		await sshClientsManager.getClient({ ...credentials, sshHost: 'host2' });
		await sshClientsManager.getClient({ ...credentials, sshHost: 'host3' });

		jest.advanceTimersByTime((idleTimeout + cleanUpInterval + 1) * 1000);

		expect(endSpy).toHaveBeenCalledTimes(3);
		expect(sshClientsManager.clients.size).toBe(0);
	});

	describe('updateLastUsed', () => {
		test('updates lastUsed in the registration', async () => {
			// ARRANGE
			const client = await sshClientsManager.getClient(credentials);
			// schedule client for clean up soon
			jest.advanceTimersByTime((idleTimeout - 1) * 1000);

			// ACT 1
			// updating lastUsed should prevent the clean up
			sshClientsManager.updateLastUsed(client);
			jest.advanceTimersByTime(idleTimeout * 1000);

			// ASSERT 1
			expect(endSpy).toHaveBeenCalledTimes(0);

			// ACT 1
			jest.advanceTimersByTime(cleanUpInterval * 1000);

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
