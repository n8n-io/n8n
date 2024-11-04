import { mock } from 'jest-mock-extended';
import type { SSHCredentials } from 'n8n-workflow';
import type { Client } from 'ssh2';
import { Container } from 'typedi';

import { SSHClientsManager } from '@/SSHClientsManager';

import { SSHTunnelHelpers } from '../ssh-tunnel-helpers';

describe('SSHTunnelHelpers', () => {
	const sshClientsManager = mock<SSHClientsManager>();
	Container.set(SSHClientsManager, sshClientsManager);
	const sshTunnelHelpers = new SSHTunnelHelpers();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getSSHClient', () => {
		const credentials = mock<SSHCredentials>();

		it('should call SSHClientsManager.getClient with the given credentials', async () => {
			const mockClient = mock<Client>();
			sshClientsManager.getClient.mockResolvedValue(mockClient);

			const client = await sshTunnelHelpers.getSSHClient(credentials);

			expect(sshClientsManager.getClient).toHaveBeenCalledWith(credentials);
			expect(client).toBe(mockClient);
		});
	});
});
