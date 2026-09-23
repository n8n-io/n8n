import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { AgentSessionLeaseLostError } from './agent-session-lease-lost.error';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';

/**
 * How long a resume that a person started waits for the session. It covers
 * the finalization of the turn that suspended, which still holds the lease.
 */
export const INTERACTIVE_RESUME_SESSION_WAIT_MS = 5_000;

/**
 * How long an agent workflow node waits for the session. Executions that share
 * a session ID then run one after the other, and only a long wait fails.
 */
export const WORKFLOW_NODE_SESSION_WAIT_MS = 30_000;

/** Renewals that can fail in a row before the local turn is aborted. */
const MAX_FAILED_RENEWALS = 2;

interface HeldLease {
	executionId: string;
	controller: AbortController;
	failedRenewals: number;
	renewing: boolean;
}

/**
 * Tracks the session leases of the turns on this main. A turn holds the lease
 * of its session while its execution is running and its heartbeat is fresh.
 * Admission rejects a second turn on the session and interrupts the execution
 * of a turn whose heartbeat is stale. That turn aborts at its next heartbeat.
 */
@Service()
export class AgentSessionLeaseService {
	/** Keyed by execution ID. */
	private readonly held = new Map<string, HeldLease>();

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: AgentExecutionRepository,
	) {
		this.logger = this.logger.scoped('agents');
	}

	/** Tracks the lease of a committed execution. The returned signal aborts when the lease is lost. */
	hold(executionId: string): AbortSignal {
		const controller = new AbortController();
		this.held.set(executionId, { executionId, controller, failedRenewals: 0, renewing: false });
		return controller.signal;
	}

	isHeld(executionId: string): boolean {
		return this.held.has(executionId);
	}

	/** Refreshes the heartbeat of the execution. Never throws. */
	async renew(executionId: string): Promise<void> {
		const lease = this.held.get(executionId);
		if (!lease || lease.controller.signal.aborted) return;
		if (lease.renewing) {
			this.countFailedRenewal(lease);
			return;
		}
		lease.renewing = true;
		try {
			await this.extend(lease);
		} finally {
			lease.renewing = false;
		}
	}

	/** Forgets the lease. The terminal write of the execution ended it. */
	release(executionId: string): void {
		this.held.delete(executionId);
	}

	private async extend(lease: HeldLease): Promise<void> {
		try {
			if (await this.executionRepository.touchRunning(lease.executionId)) {
				lease.failedRenewals = 0;
				return;
			}
			// Another turn or the sweeper interrupted the execution after its heartbeat became stale.
			this.abortTurn(lease);
		} catch (error) {
			this.countFailedRenewal(lease, error);
		}
	}

	/** A renewal that is still in progress at the next heartbeat also counts as failed. */
	private countFailedRenewal(lease: HeldLease, error?: unknown): void {
		lease.failedRenewals += 1;
		this.logger.warn('Failed to renew an agent session lease', {
			executionId: lease.executionId,
			failedRenewals: lease.failedRenewals,
			...(error !== undefined && {
				error: error instanceof Error ? error.message : String(error),
			}),
		});
		if (lease.failedRenewals >= MAX_FAILED_RENEWALS) this.abortTurn(lease);
	}

	private abortTurn(lease: HeldLease): void {
		this.logger.warn('Lost an agent session lease. Aborting the turn.', {
			executionId: lease.executionId,
		});
		lease.controller.abort(new AgentSessionLeaseLostError());
	}
}

/** Combines a turn's abort signal with the signal that fires when its session lease is lost. */
export function withLeaseSignal(
	signal: AbortSignal | undefined,
	leaseSignal: AbortSignal | undefined,
): AbortSignal | undefined {
	if (!leaseSignal) return signal;
	if (!signal) return leaseSignal;
	return AbortSignal.any([signal, leaseSignal]);
}
