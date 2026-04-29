import type { GatewayConfig } from '@n8n/computer-use/config';
import { GatewayClient } from '@n8n/computer-use/gateway-client';
import { GatewaySession } from '@n8n/computer-use/gateway-session';
import { logger } from '@n8n/computer-use/logger';
import { SettingsStore } from '@n8n/computer-use/settings-store';
import { EventEmitter } from 'node:events';

import type { DaemonStatus, StatusSnapshot } from '../shared/types';

export type { DaemonStatus, StatusSnapshot };

export interface DaemonControllerEvents {
	statusChanged: [snapshot: StatusSnapshot];
}

export class DaemonController extends EventEmitter<DaemonControllerEvents> {
	private client: GatewayClient | null = null;
	private session: GatewaySession | null = null;
	private settingsStore: SettingsStore | null = null;
	private _status: DaemonStatus = 'idle';
	private _connectedUrl: string | null = null;
	private _connectedAt: string | null = null;
	private _lastError: string | null = null;
	private lastCredentials: { url: string; apiKey: string } | null = null;

	getSnapshot(): StatusSnapshot {
		return {
			status: this._status,
			connectedUrl: this._connectedUrl,
			connectedAt: this._connectedAt,
			lastError: this._lastError,
		};
	}

	isRunning(): boolean {
		return this.client !== null;
	}

	private async getSettingsStore(): Promise<SettingsStore> {
		this.settingsStore = this.settingsStore ?? (await SettingsStore.create());
		return this.settingsStore;
	}

	private async closeCurrentConnection(options: { preserveServerSession: boolean }): Promise<void> {
		if (this.client) {
			try {
				if (options.preserveServerSession) {
					await this.client.stop();
				} else {
					await this.client.disconnect();
				}
			} catch (error) {
				logger.warn('Gateway teardown failed', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		if (this.session) {
			await this.session.flush();
		}

		this.client = null;
		this.session = null;
		this._connectedUrl = null;
		this._connectedAt = null;
	}

	private formatErrorMessage(error: unknown): string {
		if (error instanceof Error) return error.message;
		if (typeof error === 'string') return error;
		try {
			return JSON.stringify(error);
		} catch {
			return String(error);
		}
	}

	async connect(config: GatewayConfig, url: string, apiKey: string): Promise<{ apiKey: string }> {
		const normalizedUrl = url.replace(/\/$/, '');
		logger.debug('Direct gateway connect requested', { url: normalizedUrl });

		this.setStatus('connecting');
		this._lastError = null;

		await this.closeCurrentConnection({ preserveServerSession: true });
		const store = await this.getSettingsStore();
		const defaults = store.getDefaults(config);
		const session = new GatewaySession(defaults, store);
		const client = new GatewayClient({
			url: normalizedUrl,
			apiKey,
			config,
			session,
			confirmResourceAccess: () => 'denyOnce',
			onPersistentFailure: () => {
				this.afterGatewayPersistentFailure();
			},
			onDisconnected: () => {
				this.afterGatewayDisconnected();
			},
		});

		try {
			await client.start();
			const activeApiKey = client.getCurrentGatewayKey();
			this.client = client;
			this.session = session;
			this.lastCredentials = { url: normalizedUrl, apiKey: activeApiKey };
			this._connectedUrl = normalizedUrl;
			this._connectedAt = new Date().toISOString();
			this.setStatus('connected');
			return { apiKey: activeApiKey };
		} catch (error) {
			this._lastError = this.formatErrorMessage(error);
			this.clearConnectionState('error');
			throw new Error(this._lastError);
		}
	}

	async reconnect(config: GatewayConfig): Promise<void> {
		if (!this.lastCredentials) return;
		await this.connect(config, this.lastCredentials.url, this.lastCredentials.apiKey);
	}

	async disconnect(): Promise<void> {
		await this.closeCurrentConnection({ preserveServerSession: false });
		this.setStatus('disconnected');
	}

	private afterGatewayPersistentFailure(): void {
		this._lastError = 'Gateway authentication failed repeatedly';
		void this.closeCurrentConnection({ preserveServerSession: true }).then(() => {
			this.setStatus('error');
		});
	}

	private afterGatewayDisconnected(): void {
		void this.closeCurrentConnection({ preserveServerSession: true }).then(() => {
			this.setStatus('disconnected');
		});
	}

	private clearConnectionState(status: DaemonStatus): void {
		this.client = null;
		this.session = null;
		this._connectedUrl = null;
		this._connectedAt = null;
		this.setStatus(status);
	}

	private setStatus(status: DaemonStatus): void {
		logger.debug('Daemon status changed', { from: this._status, to: status });
		this._status = status;
		this.emit('statusChanged', this.getSnapshot());
	}
}
