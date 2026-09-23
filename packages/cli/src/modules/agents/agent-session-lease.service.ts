import { Logger } from '@n8n/backend-common';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import { AsyncLocalStorage } from 'node:async_hooks';

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
	/** The database confirmed that the execution no longer runs. */
	lost: boolean;
}

/**
 * Tracks the session leases of the turns on this main. A turn holds the lease
 * of its session while its execution is running and its heartbeat is fresh.
 * Admission rejects a second turn on the session and interrupts the execution
 * of a turn whose heartbeat is stale. That turn aborts at its next heartbeat.
 *
 * A turn also fences its writes: the async context of the turn carries its
 * lease, and each fenced write first checks that the execution of the turn
 * still runs. The context stays with async work that outlives the turn, so a
 * late write of a settled turn is rejected.
 */
@Service()
export class AgentSessionLeaseService {
	/** Keyed by execution ID. */
	private readonly held = new Map<string, HeldLease>();

	private readonly turnScope = new AsyncLocalStorage<HeldLease>();

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly txRunner: TransactionRunner,
	) {
		this.logger = this.logger.scoped('agents');
	}

	/** Tracks the lease of a committed execution. The returned signal aborts when the lease is lost. */
	hold(executionId: string): AbortSignal {
		const controller = new AbortController();
		this.held.set(executionId, {
			executionId,
			controller,
			failedRenewals: 0,
			renewing: false,
			lost: false,
		});
		return controller.signal;
	}

	isHeld(executionId: string): boolean {
		return this.held.has(executionId);
	}

	/** Runs `fn` as part of the turn that holds the lease, so its writes are fenced. */
	runInTurn<T>(executionId: string, fn: () => T): T {
		const lease = this.held.get(executionId);
		if (!lease) throw new UnexpectedError('The agent turn holds no session lease');
		return this.turnScope.run(lease, fn);
	}

	/** Runs `fn` outside any turn. Use it for independent work that a turn starts. */
	runOutsideTurn<T>(fn: () => T): T {
		return this.turnScope.exit(fn);
	}

	/**
	 * Runs a write of the current turn after it checks, in the same transaction,
	 * that the execution of the turn still runs. A write outside a turn runs
	 * without the check.
	 */
	async fencedWrite<T>(
		ctx: OperationContext,
		write: (ctx: OperationContext) => Promise<T>,
	): Promise<T> {
		const lease = this.turnScope.getStore();
		if (!lease) return await write(ctx);
		return await this.writeUnderLease(lease, ctx, write);
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

	private async writeUnderLease<T>(
		lease: HeldLease,
		ctx: OperationContext,
		write: (ctx: OperationContext) => Promise<T>,
	): Promise<T> {
		// The turn has settled, or the loss of its lease is confirmed.
		if (this.held.get(lease.executionId) !== lease || lease.lost) {
			throw new AgentSessionLeaseLostError();
		}
		return await this.txRunner.run(ctx, async (trxCtx) => {
			if (!(await this.executionRepository.isRunning(lease.executionId, trxCtx))) {
				// Abort first: the SDK swallows some write errors, and the abort still stops the run.
				this.loseLease(lease);
				throw new AgentSessionLeaseLostError();
			}
			return await write(trxCtx);
		});
	}

	private async extend(lease: HeldLease): Promise<void> {
		try {
			if (await this.executionRepository.touchRunning(lease.executionId)) {
				lease.failedRenewals = 0;
				return;
			}
			// Another turn or the sweeper interrupted the execution after its heartbeat became stale.
			this.loseLease(lease);
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
		// The lease can still be ours, so fenced writes keep checking the database.
		if (lease.failedRenewals >= MAX_FAILED_RENEWALS) this.abortTurn(lease);
	}

	/** Another turn owns the session. Fenced writes of this turn fail without a check. */
	private loseLease(lease: HeldLease): void {
		lease.lost = true;
		this.abortTurn(lease);
	}

	private abortTurn(lease: HeldLease): void {
		if (lease.controller.signal.aborted) return;
		this.logger.warn('Lost an agent session lease. Aborting the turn.', {
			executionId: lease.executionId,
		});
		lease.controller.abort(new AgentSessionLeaseLostError());
	}
}
