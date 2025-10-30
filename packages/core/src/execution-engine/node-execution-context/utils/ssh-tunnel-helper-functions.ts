import { Container } from '@n8n/di';
import type { SSHTunnelFunctions } from 'n8n-workflow';
import type { Client } from 'ssh2';

import { SSHClientsManager } from '../../ssh-clients-manager';

export const getSSHTunnelFunctions = (): SSHTunnelFunctions => {
	const sshClientsManager = Container.get(SSHClientsManager);
	return {
		getSSHClient: async (credentials, abortController) =>
			await sshClientsManager.getClient(credentials, abortController),
		updateLastUsed: (client: Client) => sshClientsManager.updateLastUsed(client),
	};
};
