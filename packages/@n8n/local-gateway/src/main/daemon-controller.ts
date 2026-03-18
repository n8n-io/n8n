import * as http from 'node:http';
import { EventEmitter } from 'node:events';

import type { ResolvedGatewayConfig } from '@n8n/fs-proxy/config';
import { startDaemon } from '@n8n/fs-proxy/daemon';
import { logger } from '@n8n/fs-proxy/logger';

import type { DaemonStatus, StatusSnapshot } from '../shared/types';

export type { DaemonStatus, StatusSnapshot };

export interface DaemonControllerEvents {
	'status-changed': [snapshot: StatusSnapshot];
}

export class DaemonController extends EventEmitter<DaemonControllerEvents> {
	private server: http.Server | null = null;
	private _port: number | null = null;
	private _status: DaemonStatus = 'stopped';
	private _connectedUrl: string | null = null;
	private _connectedAt: string | null = null;

	getSnapshot(): StatusSnapshot {
		return {
			status: this._status,
			connectedUrl: this._connectedUrl,
			connectedAt: this._connectedAt,
		};
	}

	isRunning(): boolean {
		return this._status !== 'stopped';
	}

	start(config: ResolvedGatewayConfig, confirmConnect: (url: string) => Promise<boolean>): void {
		if (this.server) {
			logger.debug('Daemon start requested but already running — ignoring');
			return;
		}

		this._port = config.port;
		logger.debug('Daemon starting', { port: config.port });

		this.setStatus('starting');

		this.server = startDaemon(config, {
			managedMode: true,
			confirmConnect,
			onStatusChange: (status, url) => {
				if (status === 'connected') {
					logger.info('Daemon connected', { url });
					this._connectedUrl = url ?? null;
					this._connectedAt = new Date().toISOString();
					this.setStatus('connected');
				} else {
					logger.info('Daemon disconnected');
					this._connectedUrl = null;
					this._connectedAt = null;
					this.setStatus('disconnected');
				}
			},
		});

		// Server is now listening (or will be shortly) — mark as waiting
		this.server.once('listening', () => {
			if (this._status === 'starting') {
				this.setStatus('waiting');
			}
		});

		this.server.once('error', (err: Error) => {
			logger.error('Daemon server error', { error: err.message });
			this.server = null;
			this.setStatus('stopped');
		});
	}

	async disconnectClient(): Promise<void> {
		logger.debug('Disconnecting client');
		if (!this.server || this._port === null) return;
		try {
			await fetch(`http://localhost:${this._port}/disconnect`, { method: 'POST' });
		} catch {
			// Server may be unreachable — ignore
		}
	}

	async stop(): Promise<void> {
		logger.debug('Daemon stopping');

		if (!this.server) {
			this.setStatus('stopped');
			return;
		}

		if (this._port !== null) {
			try {
				await fetch(`http://localhost:${this._port}/disconnect`, { method: 'POST' });
			} catch {
				// Server may already be unreachable — proceed with close
			}
		}

		await new Promise<void>((resolve) => {
			this.server!.close(() => {
				this.server = null;
				this._port = null;
				this._connectedUrl = null;
				this._connectedAt = null;
				this.setStatus('stopped');
				resolve();
			});
		});
	}

	private setStatus(status: DaemonStatus): void {
		logger.debug('Daemon status changed', { from: this._status, to: status });
		this._status = status;
		this.emit('status-changed', this.getSnapshot());
	}
}
