import type { SSHCredentials, SSHTunnelFunctions } from 'n8n-workflow';
import { Container } from 'typedi';

import { SSHClientsManager } from '@/SSHClientsManager';

export class SSHTunnelHelpers {
	private readonly sshClientsManager = Container.get(SSHClientsManager);

	get exported(): SSHTunnelFunctions {
		return {
			getSSHClient: this.getSSHClient.bind(this),
		};
	}

	async getSSHClient(credentials: SSHCredentials) {
		return await this.sshClientsManager.getClient(credentials);
	}
}
