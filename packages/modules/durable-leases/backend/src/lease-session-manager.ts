import type { Logger } from '@n8n/backend-common';
import type { LeaseKindRepository, LeaseSessionRepository } from '@n8n/db';
import { randomUUID } from 'node:crypto';

export interface LeaseSessionManagerDeps {
	kind: string;
	leaseSeconds: number;
	hostId: string;
	bootId: string;
	kinds: LeaseKindRepository;
	sessions: LeaseSessionRepository;
	logger: Logger;
}

export class LeaseSessionManager {
	private currentId: string | undefined;

	private stopped = false;

	private stopping: Promise<void> | undefined;

	private inFlightInsert: Promise<void> | undefined;

	constructor(private readonly deps: LeaseSessionManagerDeps) {}

	async start(): Promise<void> {
		await this.ensureSession();
	}

	private async ensureSession(): Promise<void> {
		if (this.stopped || this.currentId !== undefined) return;
		this.inFlightInsert = this.insertSession(randomUUID());
		await this.inFlightInsert;
	}

	async stop(): Promise<void> {
		this.stopping ??= this.shutDown();
		await this.stopping;
	}

	private async shutDown(): Promise<void> {
		this.stopped = true;

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
}
