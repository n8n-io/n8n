import { Logger } from '@n8n/backend-common';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { randomUUID } from 'node:crypto';

import { AgentSessionLeaseLostError } from './agent-session-lease-lost.error';
import { AgentTurnAlreadyRunningError } from './agent-turn-already-running.error';
import { AgentSessionLeaseRepository } from './repositories/agent-session-lease.repository';

/** Another main can take over a lease that is not renewed within this time. */
export const SESSION_LEASE_TTL_MS = 120_000;

/** Renewals that can fail in a row before the local turn is aborted. */
const MAX_FAILED_RENEWALS = 2;

export interface SessionLeaseRequest {
	threadId: string;
	agentId: string;
	executionId: string;
}

export interface SessionLeaseGrant extends SessionLeaseRequest {
	ownerToken: string;
	epoch: number;
	/** The execution whose expired lease this grant took over, if any. */
	previousExecutionId: string | null;
}

interface HeldLease {
	executionId: string;
	ownerToken: string;
	controller: AbortController;
	failedRenewals: number;
	renewing: boolean;
}

/**
 * Allows one agent turn at a time on a session. The database row decides
 * between mains. The local registry keeps this main from starting a turn on a
 * session while an older local turn on that session is still settling.
 */
@Service()
export class AgentSessionLeaseService {
	private readonly held = new Map<string, HeldLease>();

	constructor(
		private readonly logger: Logger,
		private readonly repository: AgentSessionLeaseRepository,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.scoped('agents');
	}

	/** Takes the lease in the caller's transaction. Throws when another turn holds the session. */
	async acquire(request: SessionLeaseRequest, ctx: OperationContext): Promise<SessionLeaseGrant> {
		if (this.held.has(request.threadId)) throw new AgentTurnAlreadyRunningError();
		const ownerToken = randomUUID();
		const acquisition = await this.repository.acquire(
			{ ...request, ownerToken, ownerHostId: this.instanceSettings.hostId },
			SESSION_LEASE_TTL_MS,
			ctx,
		);
		if (!acquisition.acquired) throw new AgentTurnAlreadyRunningError();
		const { epoch, previousExecutionId } = acquisition;
		return { ...request, ownerToken, epoch, previousExecutionId };
	}

	/** Tracks a committed lease. The returned signal aborts when the lease is lost. */
	hold(grant: SessionLeaseGrant): AbortSignal {
		const controller = new AbortController();
		this.held.set(grant.threadId, {
			executionId: grant.executionId,
			ownerToken: grant.ownerToken,
			controller,
			failedRenewals: 0,
			renewing: false,
		});
		return controller.signal;
	}

	/** Extends the lease on each execution heartbeat. Never throws. */
	async renew(threadId: string, executionId: string): Promise<void> {
		const lease = this.findHeld(threadId, executionId);
		if (!lease || lease.controller.signal.aborted) return;
		if (lease.renewing) {
			this.countFailedRenewal(threadId, lease);
			return;
		}
		lease.renewing = true;
		try {
			await this.extend(threadId, lease);
		} finally {
			lease.renewing = false;
		}
	}

	isLost(threadId: string, executionId: string): boolean {
		const lease = this.findHeld(threadId, executionId);
		return lease?.controller.signal.reason instanceof AgentSessionLeaseLostError;
	}

	/** Frees the lease. Never throws: a lease that cannot be freed expires. */
	async release(threadId: string, executionId: string): Promise<void> {
		const lease = this.findHeld(threadId, executionId);
		if (!lease) return;
		try {
			await this.repository.release(threadId, lease.ownerToken);
		} catch (error) {
			this.logger.warn('Failed to release an agent session lease', {
				threadId,
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		} finally {
			this.held.delete(threadId);
		}
	}

	private async extend(threadId: string, lease: HeldLease): Promise<void> {
		try {
			const renewed = await this.repository.renew(threadId, lease.ownerToken, SESSION_LEASE_TTL_MS);
			if (renewed) {
				lease.failedRenewals = 0;
				return;
			}
			// Another main took over the expired lease.
			this.abortTurn(threadId, lease);
		} catch (error) {
			this.countFailedRenewal(threadId, lease, error);
		}
	}

	/** A renewal that is still in progress at the next heartbeat also counts as failed. */
	private countFailedRenewal(threadId: string, lease: HeldLease, error?: unknown): void {
		lease.failedRenewals += 1;
		this.logger.warn('Failed to renew an agent session lease', {
			threadId,
			executionId: lease.executionId,
			failedRenewals: lease.failedRenewals,
			...(error !== undefined && {
				error: error instanceof Error ? error.message : String(error),
			}),
		});
		if (lease.failedRenewals >= MAX_FAILED_RENEWALS) this.abortTurn(threadId, lease);
	}

	private abortTurn(threadId: string, lease: HeldLease): void {
		this.logger.warn('Lost an agent session lease. Aborting the turn.', {
			threadId,
			executionId: lease.executionId,
		});
		lease.controller.abort(new AgentSessionLeaseLostError());
	}

	private findHeld(threadId: string, executionId: string): HeldLease | undefined {
		const lease = this.held.get(threadId);
		return lease?.executionId === executionId ? lease : undefined;
	}
}

/** Combines a turn's abort signal with the signal that fires when its session lease is lost. */
export function withLeaseSignal(
	signal: AbortSignal | undefined,
	leaseSignal: AbortSignal,
): AbortSignal {
	if (!signal) return leaseSignal;
	return AbortSignal.any([signal, leaseSignal]);
}
