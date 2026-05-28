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
	private _status: DaemonStatus = 'disconnected';
	private _connectedUrl: string | null = null;
	private _lastError: string | null = null;

	getSnapshot(): StatusSnapshot {
		return {
			status: this._status,
			connectedUrl: this._connectedUrl,
			lastError: this._lastError,
		};
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

	async connect(config: GatewayConfig, url: string, apiKey: string): Promise<void> {
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
			this.client = client;
			this.session = session;
			this._connectedUrl = normalizedUrl;
			this.setStatus('connected');
		} catch (error) {
			this._lastError = this.formatErrorMessage(error);
			this.clearConnectionState('error');
			throw new Error(this._lastError);
		}
	}

	async disconnect(): Promise<void> {
		await this.closeCurrentConnection({ preserveServerSession: false });
		this.setStatus('disconnected');
	}

	private afterGatewayPersistentFailure(): void {
		this._lastError = 'Gateway authentication failed repeatedly';
		void this.closeCurrentConnection({ preserveServerSession: true }).finally(() => {
			this.setStatus('error');
		});
	}

	private afterGatewayDisconnected(): void {
		void this.closeCurrentConnection({ preserveServerSession: true }).finally(() => {
			this.setStatus('disconnected');
		});
	}

	private clearConnectionState(status: DaemonStatus): void {
		this.client = null;
		this.session = null;
		this._connectedUrl = null;
		this.setStatus(status);
	}

	private setStatus(status: DaemonStatus): void {
		logger.debug('Daemon status changed', { from: this._status, to: status });
		this._status = status;
		this.emit('statusChanged', this.getSnapshot());
	}
}
