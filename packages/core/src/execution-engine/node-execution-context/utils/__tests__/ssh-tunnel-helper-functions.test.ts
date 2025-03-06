import { mock } from 'jest-mock-extended';
import type { SSHCredentials } from 'n8n-workflow';

import { mockInstance } from '@test/utils';

import { SSHClientsManager } from '../../../ssh-clients-manager';
import { getSSHTunnelFunctions } from '../ssh-tunnel-helper-functions';

describe('getSSHTunnelFunctions', () => {
	const credentials = mock<SSHCredentials>();
	const sshClientsManager = mockInstance(SSHClientsManager);
	const sshTunnelFunctions = getSSHTunnelFunctions();

	it('should return SSH tunnel functions', () => {
		expect(typeof sshTunnelFunctions.getSSHClient).toBe('function');
	});

	describe('getSSHClient', () => {
		it('should invoke sshClientsManager.getClient', async () => {
			await sshTunnelFunctions.getSSHClient(credentials);

			expect(sshClientsManager.getClient).toHaveBeenCalledWith(credentials);
		});
	});
});
