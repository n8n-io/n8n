import type { Logger } from '@n8n/backend-common';
import type { LeaseKindRepository, LeaseSessionRepository } from '@n8n/db';
import { randomUUID } from 'node:crypto';

export interface LeaseSessionManagerDeps {
	kind: string;
	leaseSeconds: number;
	renewSeconds: number;
	hostId: string;
	bootId: string;
	kinds: LeaseKindRepository;
	sessions: LeaseSessionRepository;
	logger: Logger;
}

const BEAT_JITTER = 0.1;

export class LeaseSessionManager {
	private currentId: string | undefined;

	private started = false;

	private stopped = false;

	private stopping: Promise<void> | undefined;

	private beatTimer: NodeJS.Timeout | undefined;

	private inFlightRenewal: Promise<void> | undefined;

	private inFlightInsert: Promise<void> | undefined;

	private readonly pendingDeletes = new Set<Promise<void>>();

	constructor(private readonly deps: LeaseSessionManagerDeps) {}

	async start(): Promise<void> {
		if (this.stopped) return;
		if (!this.started) {
			this.started = true;
			this.scheduleBeat();
		}
		await this.ensureSession();
	}

	private async ensureSession(): Promise<void> {
		if (this.stopped || this.currentId !== undefined) return;
		this.inFlightInsert ??= this.insertSession(randomUUID()).finally(() => {
			this.inFlightInsert = undefined;
		});
		await this.inFlightInsert;
	}

	async stop(): Promise<void> {
		this.stopping ??= this.shutDown();
		await this.stopping;
	}

	private async shutDown(): Promise<void> {
		this.stopped = true;
		clearTimeout(this.beatTimer);
		this.beatTimer = undefined;

		await this.inFlightInsert?.catch(() => {});

		const id = this.currentId;
		this.currentId = undefined;
		if (id !== undefined) {
			try {
				await this.deps.sessions.deleteSession(id, {});
			} catch (error) {
				this.deps.logger.warn('Failed to delete lease session', {
					kind: this.deps.kind,
					sessionId: id,
					error,
				});
			}
		}

		await Promise.all(this.pendingDeletes);
	}

	private async insertSession(id: string): Promise<void> {
		const { kind, hostId, bootId, leaseSeconds, kinds, sessions } = this.deps;

		await kinds.insertIfMissing(kind, {});

		await sessions.insertSession(
			{ id, leaseKind: kind, hostId, bootId, leaseDurationSeconds: leaseSeconds },
			{},
		);

		this.currentId = id;
	}

	private scheduleBeat(): void {
		if (this.stopped) return;
		const jitter = 1 + (Math.random() * 2 - 1) * BEAT_JITTER;
		this.beatTimer = setTimeout(
			() => {
				this.beatTimer = undefined;
				this.beat();
				this.scheduleBeat();
			},
			this.deps.renewSeconds * 1000 * jitter,
		);
	}

	private beat(): void {
		if (this.stopped) return;

		const id = this.currentId;
		if (id === undefined) {
			void this.ensureSession().catch((error: unknown) => {
				this.deps.logger.warn('Failed to start lease session', { kind: this.deps.kind, error });
			});
			return;
		}

		if (this.inFlightRenewal !== undefined) return;
		this.inFlightRenewal = this.renew(id).finally(() => {
			this.inFlightRenewal = undefined;
		});
	}

	private async renew(id: string): Promise<void> {
		const { sessions, leaseSeconds } = this.deps;

		let renewed: boolean;
		try {
			renewed = await sessions.renewLive(id, leaseSeconds, {});
		} catch (error) {
			this.deps.logger.warn('Failed to renew lease session', {
				kind: this.deps.kind,
				sessionId: id,
				error,
			});
			return;
		}

		// Stop has already deleted the row of the current session.
		if (this.stopped) return;

		if (!renewed) this.lose('renewal found the lease session expired');
	}

	private lose(reason: string): void {
		const id = this.currentId;
		if (id === undefined) return;
		this.currentId = undefined;
		this.deps.logger.warn('Lost lease session', { kind: this.deps.kind, sessionId: id, reason });
		this.deleteRow(id);
	}

	private deleteRow(id: string): void {
		const deleting = this.deps.sessions
			.deleteSession(id, {})
			.catch((error: unknown) => {
				this.deps.logger.warn('Failed to delete lease session', {
					kind: this.deps.kind,
					sessionId: id,
					error,
				});
			})
			.finally(() => this.pendingDeletes.delete(deleting));
		this.pendingDeletes.add(deleting);
	}
}
