import type { SSHCredentials } from 'n8n-workflow';
import { Client } from 'ssh2';

import { SSHClientsManager } from '../ssh-clients-manager';

describe('SSHClientsManager', () => {
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
		jest.useFakeTimers();

		sshClientsManager = new SSHClientsManager();
		connectSpy.mockImplementation(function (this: Client) {
			this.emit('ready');
			return this;
		});
	});

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

	it('should close all SSH connections on process exit', async () => {
		await sshClientsManager.getClient(credentials);
		sshClientsManager.onShutdown();

		expect(endSpy).toHaveBeenCalledTimes(1);
	});

	it('should cleanup stale SSH connections', async () => {
		await sshClientsManager.getClient({ ...credentials, sshHost: 'host1' });
		await sshClientsManager.getClient({ ...credentials, sshHost: 'host2' });
		await sshClientsManager.getClient({ ...credentials, sshHost: 'host3' });

		jest.advanceTimersByTime(6 * 60 * 1000);
		sshClientsManager.cleanupStaleConnections();

		expect(endSpy).toHaveBeenCalledTimes(3);
		expect(sshClientsManager.clients.size).toBe(0);
	});
});
