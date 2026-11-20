import type { Logger } from '@n8n/backend-common';
import type { LeaseKindRepository, LeaseSessionRepository } from '@n8n/db';
import { randomUUID } from 'node:crypto';

export interface SessionClock {
	monotonicMs(): number;
	wallMs(): number;
}

export const systemClock: SessionClock = {
	monotonicMs: () => performance.now(),
	wallMs: () => Date.now(),
};

export interface LeaseSessionManagerDeps {
	kind: string;
	leaseSeconds: number;
	renewSeconds: number;
	marginSeconds: number;
	hostId: string;
	bootId: string;
	kinds: LeaseKindRepository;
	sessions: LeaseSessionRepository;
	clock: SessionClock;
	logger: Logger;
}

const WATCHDOG_INTERVAL_MS = 100;

const BEAT_JITTER = 0.1;

export class LeaseSessionManager {
	private currentId: string | undefined;

	private deadlineMono = 0;

	private deadlineWall = 0;

	private started = false;

	private stopped = false;

	private stopping: Promise<void> | undefined;

	private beatTimer: NodeJS.Timeout | undefined;

	private watchdogTimer: NodeJS.Timeout | undefined;

	private inFlightRenewal: { id: string; done: Promise<void> } | undefined;

	private inFlightInsert: Promise<void> | undefined;

	private readonly pendingDeletes = new Set<Promise<void>>();

	constructor(private readonly deps: LeaseSessionManagerDeps) {}

	async start(): Promise<void> {
		if (this.stopped) return;
		if (!this.started) {
			this.started = true;
			this.watchdogTimer = setInterval(() => this.checkDeadlines(), WATCHDOG_INTERVAL_MS);
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
		clearInterval(this.watchdogTimer);
		this.beatTimer = undefined;
		this.watchdogTimer = undefined;

		await this.inFlightInsert?.catch(() => {});

		const id = this.currentId;
		this.currentId = undefined;
		if (id !== undefined) await this.deleteSession(id);

		await Promise.all(this.pendingDeletes);
	}

	private async insertSession(id: string): Promise<void> {
		const { kind, hostId, bootId, kinds, sessions, clock } = this.deps;
		const { leaseSeconds } = this.deps;

		await kinds.insertIfMissing(kind, {});

		// Deadlines count from before the request, so a slow response never extends them.
		const sentMono = clock.monotonicMs();
		const sentWall = clock.wallMs();
		await sessions.insertSession(
			{ id, leaseKind: kind, hostId, bootId, leaseDurationSeconds: leaseSeconds },
			{},
		);

		this.currentId = id;
		this.moveDeadlines(sentMono, sentWall);
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
				this.warn('Failed to start lease session', { error });
			});
			return;
		}

		if (this.inFlightRenewal?.id === id) return;
		const renewal = {
			id,
			done: this.renew(id).finally(() => {
				if (this.inFlightRenewal === renewal) this.inFlightRenewal = undefined;
			}),
		};
		this.inFlightRenewal = renewal;
	}

	private async renew(id: string): Promise<void> {
		const { clock, sessions, leaseSeconds } = this.deps;
		const sentMono = clock.monotonicMs();
		const sentWall = clock.wallMs();

		let renewed: boolean;
		try {
			renewed = await sessions.renewLive(id, leaseSeconds, {});
		} catch (error) {
			this.deps.logger.warn('Failed to renew lease session', {
				kind: this.deps.kind,
				sessionId: id,
				error,
			});
			// The session stays; the watchdog loses it when the deadline passes.
			return;
		}

		// Stop has already deleted the current row and waited for the deletes of lost sessions.
		if (this.stopped) return;

		if (renewed) {
			if (this.currentId === id) {
				this.moveDeadlines(sentMono, sentWall);
			} else {
				this.deleteRow(id);
			}
			return;
		}

		if (this.currentId === id) this.lose('renewal found the lease session expired');
	}

	private checkDeadlines(): void {
		if (this.currentId === undefined) return;
		const { clock } = this.deps;
		// Either clock past its deadline loses the session, so a clock jump or a suspended process cannot extend it.
		if (clock.monotonicMs() > this.deadlineMono || clock.wallMs() > this.deadlineWall) {
			this.lose('lease session deadline passed');
		}
	}

	private moveDeadlines(sentMono: number, sentWall: number): void {
		const validMs = (this.deps.leaseSeconds - this.deps.marginSeconds) * 1000;
		this.deadlineMono = sentMono + validMs;
		this.deadlineWall = sentWall + validMs;
	}

	private lose(reason: string): void {
		const id = this.currentId;
		if (id === undefined) return;
		this.currentId = undefined;
		this.warn('Lost lease session', { sessionId: id, reason });
		this.deleteRow(id);
	}

	private deleteRow(id: string): void {
		track(this.pendingDeletes, this.deleteSession(id));
	}

	private async deleteSession(id: string): Promise<void> {
		try {
			await this.deps.sessions.deleteSession(id, {});
		} catch (error) {
			this.warn('Failed to delete lease session', { sessionId: id, error });
		}
	}

	private warn(message: string, meta: Record<string, unknown>): void {
		this.deps.logger.warn(message, { kind: this.deps.kind, ...meta });
	}
}
