import { Logger } from '@n8n/backend-common';
import { Config, Env } from '@n8n/config';
import { Service } from '@n8n/di';
import type { SSHCredentials } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { Client, type ConnectConfig } from 'ssh2';
import { z } from 'zod';

@Config
export class SSHClientsConfig {
	/** How many seconds before an idle SSH tunnel is closed */
	@Env(
		'N8N_SSH_TUNNEL_IDLE_TIMEOUT',
		z
			.string()
			.transform((value) => Number.parseInt(value))
			.superRefine((value, ctx) => {
				if (Number.isNaN(value)) {
					return ctx.addIssue({
						message: 'must be a valid integer',
						code: 'custom',
					});
				}

				if (value <= 0) {
					return ctx.addIssue({
						message: 'must be positive',
						code: 'too_small',
						minimum: 0,
						inclusive: false,
						type: 'number',
					});
				}
			}),
	)
	idleTimeout: number = 5 * 60;
}

type Registration = {
	client: Client;

	/**
	 * We keep this timestamp to check if a client hasn't been used in a while,
	 * and if it needs to be closed.
	 */
	lastUsed: Date;

	abortController: AbortController;

	returnPromise: Promise<Client>;
};

@Service()
export class SSHClientsManager {
	readonly clients = new Map<string, Registration>();

	readonly clientsReversed = new WeakMap<Client, string>();

	private cleanupTimer: NodeJS.Timeout;

	constructor(
		private readonly config: SSHClientsConfig,
		private readonly logger: Logger,
	) {
		// Close all SSH connections when the process exits
		process.on('exit', () => this.onShutdown());

		// Regularly close stale SSH connections
		this.cleanupTimer = setInterval(() => this.cleanupStaleConnections(), 60 * 1000);

		this.logger = logger.scoped('ssh-client');
	}

	updateLastUsed(client: Client) {
		const key = this.clientsReversed.get(client);

		if (key) {
			const registration = this.clients.get(key);

			if (registration) {
				registration.lastUsed = new Date();
			}
		} else {
			const metadata = {};
			// eslint-disable-next-line @typescript-eslint/unbound-method
			Error.captureStackTrace(metadata, this.updateLastUsed);
			this.logger.warn(
				'Tried to update `lastUsed` for a client that has been cleaned up already. Probably forgot to subscribe to the AbortController somewhere.',
				metadata,
			);
		}
	}

	async getClient(credentials: SSHCredentials, abortController?: AbortController): Promise<Client> {
		abortController = abortController ?? new AbortController();

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
			return await existing.returnPromise;
		}

		const sshClient = this.withCleanupHandler(new Client(), abortController, clientHash);
		const returnPromise = new Promise<Client>((resolve, reject) => {
			sshClient.once('error', reject);
			sshClient.once('ready', () => {
				sshClient.off('error', reject);
				resolve(sshClient);
			});
			sshClient.connect(sshConfig);
		});

		this.clients.set(clientHash, {
			client: sshClient,
			lastUsed: new Date(),
			abortController,
			returnPromise,
		});
		this.clientsReversed.set(sshClient, clientHash);

		return await returnPromise;
	}

	/**
	 * Registers the cleanup handler for events (error, close, end) on the ssh
	 * client and in the abort signal is received.
	 */
	private withCleanupHandler(sshClient: Client, abortController: AbortController, key: string) {
		sshClient.on('error', (error) => {
			this.logger.error('encountered error, calling cleanup', { error });
			this.cleanupClient(key);
		});
		sshClient.on('end', () => {
			this.logger.debug('socket was disconnected, calling abort signal', {});
			this.cleanupClient(key);
		});
		sshClient.on('close', () => {
			this.logger.debug('socket was closed, calling abort signal', {});
			this.cleanupClient(key);
		});
		abortController.signal.addEventListener('abort', () => {
			this.logger.debug('Got abort signal, cleaning up ssh client.', {
				reason: abortController.signal.reason,
			});
			this.cleanupClient(key);
		});

		return sshClient;
	}

	private cleanupClient(key: string) {
		const registration = this.clients.get(key);
		if (registration) {
			this.clients.delete(key);
			registration.client.end();
			if (!registration.abortController.signal.aborted) {
				registration.abortController.abort();
			}
		}
	}

	onShutdown() {
		this.logger.debug('Shutting down. Cleaning up all clients');
		clearInterval(this.cleanupTimer);
		for (const key of this.clients.keys()) {
			this.cleanupClient(key);
		}
	}

	cleanupStaleConnections() {
		const { clients } = this;
		if (clients.size === 0) return;

		const now = Date.now();
		for (const [key, { lastUsed }] of clients.entries()) {
			if (now - lastUsed.getTime() > this.config.idleTimeout * 1000) {
				this.logger.debug('Found stale client. Cleaning it up.');
				this.cleanupClient(key);
			}
		}
	}
}
