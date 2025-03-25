import { Container } from '@n8n/di';
import type { SSHTunnelFunctions } from 'n8n-workflow';

import { SSHClientsManager } from '../../ssh-clients-manager';

export const getSSHTunnelFunctions = (): SSHTunnelFunctions => {
	const sshClientsManager = Container.get(SSHClientsManager);
	return {
		getSSHClient: async (credentials) => await sshClientsManager.getClient(credentials),
	};
};
