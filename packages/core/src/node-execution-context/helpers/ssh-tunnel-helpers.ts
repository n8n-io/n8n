import { Container } from 'typedi';
import type { SSHCredentials, SSHTunnelFunctions } from 'n8n-workflow';

import { SSHClientsManager } from '@/SSHClientsManager';

export class SSHTunnelHelpers implements SSHTunnelFunctions {
	private readonly sshClientsManager = Container.get(SSHClientsManager);

	async getSSHClient(credentials: SSHCredentials) {
		return await this.sshClientsManager.getClient(credentials);
	}
}
