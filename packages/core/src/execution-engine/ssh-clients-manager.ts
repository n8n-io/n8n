import { Config, Env } from '@n8n/config';
import { Service } from '@n8n/di';
import type { SSHCredentials } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { Client, type ConnectConfig } from 'ssh2';

@Config
class SSHClientsConfig {
	/** How many seconds before an idle SSH tunnel is closed */
	@Env('N8N_SSH_TUNNEL_IDLE_TIMEOUT')
	idleTimeout: number = 5 * 60;
}

@Service()
export class SSHClientsManager {
	readonly clients = new Map<string, { client: Client; lastUsed: Date }>();

	constructor(private readonly config: SSHClientsConfig) {
		// Close all SSH connections when the process exits
		process.on('exit', () => this.onShutdown());

		if (process.env.NODE_ENV === 'test') return;

		// Regularly close stale SSH connections
		setInterval(() => this.cleanupStaleConnections(), 60 * 1000);
	}

	async getClient(credentials: SSHCredentials): Promise<Client> {
		const { sshAuthenticateWith, sshHost, sshPort, sshUser } = credentials;
		const sshConfig: ConnectConfig = {
			host: sshHost,
			port: sshPort,
			username: sshUser,
			...(sshAuthenticateWith === 'password'
				? { password: credentials.sshPassword }
				: {
						privateKey: credentials.privateKey,
						passphrase: credentials.passphrase ?? undefined,
					}),
		};

		const clientHash = createHash('sha1').update(JSON.stringify(sshConfig)).digest('base64');

		const existing = this.clients.get(clientHash);
		if (existing) {
			existing.lastUsed = new Date();
			return existing.client;
		}

		return await new Promise((resolve, reject) => {
			const sshClient = new Client();
			sshClient.once('error', reject);
			sshClient.once('ready', () => {
				sshClient.off('error', reject);
				sshClient.once('close', () => this.clients.delete(clientHash));
				this.clients.set(clientHash, {
					client: sshClient,
					lastUsed: new Date(),
				});
				resolve(sshClient);
			});
			sshClient.connect(sshConfig);
		});
	}

	onShutdown() {
		for (const { client } of this.clients.values()) {
			client.end();
		}
	}

	cleanupStaleConnections() {
		const { clients } = this;
		if (clients.size === 0) return;

		const now = Date.now();
		for (const [hash, { client, lastUsed }] of clients.entries()) {
			if (now - lastUsed.getTime() > this.config.idleTimeout * 1000) {
				client.end();
				clients.delete(hash);
			}
		}
	}
}
