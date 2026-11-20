import type { Logger } from '@n8n/backend-common';
import type { LeaseKindRepository, LeaseSessionRepository } from '@n8n/db';
import { OperationalError } from '@n8n/errors';
import { randomUUID } from 'node:crypto';

import { track } from './promises';

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

interface ClockReading {
	mono: number;
	wall: number;
}

const WATCHDOG_INTERVAL_MS = 100;

const BEAT_JITTER = 0.1;

export class LeaseSessionManager {
	private currentId: string | undefined;

	private deadline: ClockReading = { mono: 0, wall: 0 };

	private started = false;

	private stopped = false;

	private stopping: Promise<void> | undefined;

	private beatTimer: NodeJS.Timeout | undefined;

	private watchdogTimer: NodeJS.Timeout | undefined;

	private inFlightRenewal: { id: string; done: Promise<void> } | undefined;

	private inFlightInsert: { id: string; startedMono: number; done: Promise<void> } | undefined;

	private readonly pendingDeletes = new Set<Promise<void>>();

	private readonly abandonedInserts = new Set<Promise<void>>();

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
		if (this.inFlightInsert === undefined) {
			const id = randomUUID();
			const insert = {
				id,
				startedMono: this.deps.clock.monotonicMs(),
				done: this.insertSession(id).finally(() => {
					if (this.inFlightInsert === insert) this.inFlightInsert = undefined;
				}),
			};
			this.inFlightInsert = insert;
		}
		const finished = await this.waitAtMostOneLease(this.inFlightInsert.done);
		if (!finished) {
			throw new OperationalError(
				`Lease session insert for kind "${this.deps.kind}" did not finish within the lease length`,
			);
		}
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

		await this.waitForInsert();

		const id = this.currentId;
		this.currentId = undefined;
		if (id !== undefined) await this.deleteSession(id);

		await Promise.all(this.pendingDeletes);
	}

	private async waitForInsert(): Promise<void> {
		const inserts = [...this.abandonedInserts];
		if (this.inFlightInsert !== undefined) inserts.push(this.inFlightInsert.done);
		if (inserts.length === 0) return;
		// A row that lands after this wait expires on its own within the lease length.
		await this.waitAtMostOneLease(
			Promise.all(inserts.map(async (insert) => await insert.catch(() => {}))).then(() => {}),
		);
	}

	private async waitAtMostOneLease(done: Promise<void>): Promise<boolean> {
		let timer: NodeJS.Timeout | undefined;
		const giveUp = new Promise<false>((resolve) => {
			timer = setTimeout(() => resolve(false), this.deps.leaseSeconds * 1000);
		});
		try {
			return await Promise.race([done.then(() => true as const), giveUp]);
		} finally {
			clearTimeout(timer);
		}
	}

	private async insertSession(id: string): Promise<void> {
		const { kind, hostId, bootId, leaseSeconds, kinds, sessions } = this.deps;

		await kinds.insertIfMissing(kind, {});

		// Deadlines count from before the request, so a slow response never extends them.
		const sent = this.readClock();
		await sessions.insertSession(
			{ id, leaseKind: kind, hostId, bootId, leaseDurationSeconds: leaseSeconds },
			{},
		);

		if (this.stopped || this.inFlightInsert?.id !== id) {
			this.deleteRow(id);
			return;
		}
		this.currentId = id;
		this.moveDeadlines(sent);
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
			this.abandonStaleInsert();
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
		const { sessions, leaseSeconds } = this.deps;
		const sent = this.readClock();

		let renewed: boolean;
		try {
			renewed = await sessions.renewLive(id, leaseSeconds, {});
		} catch (error) {
			this.warn('Failed to renew lease session', { sessionId: id, error });
			// The session stays; the watchdog loses it when the deadline passes.
			return;
		}

		// Stop has already deleted the row of the current session.
		if (this.stopped) return;

		if (renewed) {
			if (this.currentId === id) {
				this.moveDeadlines(sent);
			} else {
				this.deleteRow(id);
			}
			return;
		}

		if (this.currentId === id) this.lose('renewal found the lease session expired');
	}

	private abandonStaleInsert(): void {
		const insert = this.inFlightInsert;
		if (insert === undefined) return;
		if (this.deps.clock.monotonicMs() - insert.startedMono < this.deps.leaseSeconds * 1000) return;
		this.deps.logger.warn('Abandoned a lease session insert that did not finish', {
			kind: this.deps.kind,
			sessionId: insert.id,
		});
		this.inFlightInsert = undefined;
		const abandoned = insert.done
			.catch(() => {})
			.finally(() => this.abandonedInserts.delete(abandoned));
		this.abandonedInserts.add(abandoned);
	}

	private checkDeadlines(): void {
		if (this.currentId === undefined) return;
		const now = this.readClock();
		// Either clock past its deadline loses the session, so a clock jump or a suspended process cannot extend it.
		if (now.mono > this.deadline.mono || now.wall > this.deadline.wall) {
			this.lose('lease session deadline passed');
		}
	}

	private readClock(): ClockReading {
		return { mono: this.deps.clock.monotonicMs(), wall: this.deps.clock.wallMs() };
	}

	private moveDeadlines(sent: ClockReading): void {
		const validMs = (this.deps.leaseSeconds - this.deps.marginSeconds) * 1000;
		this.deadline = { mono: sent.mono + validMs, wall: sent.wall + validMs };
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
