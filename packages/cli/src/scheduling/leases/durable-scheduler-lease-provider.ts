import type {
	Lease,
	LeaseEndReason,
	LeaseKindOptions,
	LeaseProvider,
	LeaseSpec,
} from '@n8n/leases';
import type { OperationContext, ScheduledTaskRepository } from '@n8n/db';
import { LeaseEndedError } from '@n8n/leases';
import { HolderShutdownError, TaskTimeoutError } from '@n8n/scheduler';
import type { ClaimedTask } from '@n8n/scheduler';
import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError } from 'n8n-workflow';

import type { HeldJob, HeldTaskProvisioner } from '../held-tasks/held-task-provisioner';
import type { DurableScheduler } from '../durable-scheduler';

const PREFIX = 'lease:';

/** The longest key a lease of this provider can have: the job name holds the prefix, the kind and the key. */
export const MAX_LEASE_KEY_LENGTH = 200;

/** The task type and the owner type of a kind's hold jobs. */
export const leaseOwnerType = (kind: string) => `${PREFIX}${kind}`;

/** The scheduler operations the provider needs. */
export type LeaseScheduler = Pick<DurableScheduler, 'registerHoldTaskHandler' | 'registerJobOwner'>;

/** The provisioner operation the provider needs. */
export type LeaseProvisioner = Pick<HeldTaskProvisioner, 'sync'>;

/** The fence check the provider needs. */
export type LeaseFenceCheck = Pick<ScheduledTaskRepository, 'isHeld'>;

interface LeasePayload {
	key: string;
	data: Record<string, unknown>;
}

/**
 * Binds the lease port to the durable scheduler: each lease is one hold job,
 * owned by `lease:<kind>` with the lease key as owner id. The scheduler claims,
 * renews, fences and hands over the hold task; the task's lease epoch is the
 * fencing token. A lease is held while its task is `running` at that epoch,
 * claimed by `host`, and not past its lease expiry.
 */
export class DurableSchedulerLeaseProvider implements LeaseProvider<OperationContext> {
	private readonly options = new Map<string, LeaseKindOptions>();

	constructor(
		private readonly scheduler: LeaseScheduler,
		private readonly provisioner: LeaseProvisioner,
		private readonly fence: LeaseFenceCheck,
		private readonly host: string,
	) {}

	registerHolder(
		kind: string,
		options: LeaseKindOptions,
		hold: (lease: Lease<OperationContext>) => Promise<void>,
	): void {
		this.options.set(kind, options);
		this.scheduler.registerHoldTaskHandler(leaseOwnerType(kind), {
			mode: 'hold',
			hold: async (task, holder, run) => {
				const { key, data } = parsePayload(task);
				const claim = { id: task.id, claimedEpoch: task.leaseEpoch, host: this.host };
				await hold({
					kind,
					key,
					data,
					fencingToken: task.leaseEpoch,
					signal: leaseSignal(run.signal),
					ready: async () => await holder.ready(),
					isHeld: async (ctx) => await this.fence.isHeld(claim, ctx),
				});
			},
		});
	}

	registerLiveness(kind: string, findDesired: (keys: string[]) => Promise<Set<string>>): void {
		this.scheduler.registerJobOwner(leaseOwnerType(kind), { findExisting: findDesired });
	}

	async sync(
		kind: string,
		desired: readonly LeaseSpec[],
		scope?: readonly string[],
	): Promise<void> {
		const options = this.options.get(kind);
		if (options === undefined) {
			throw new UnexpectedError('Lease kind has no registered holder', { extra: { kind } });
		}
		await this.provisioner.sync(
			leaseOwnerType(kind),
			desired.map((spec) => toHeldJob(kind, spec, options)),
			scope,
		);
	}
}

function toHeldJob(kind: string, spec: LeaseSpec, options: LeaseKindOptions): HeldJob {
	if (spec.key.length === 0 || spec.key.length > MAX_LEASE_KEY_LENGTH) {
		throw new UnexpectedError('Lease key is empty or too long', {
			extra: { kind, keyLength: spec.key.length },
		});
	}
	return {
		name: `${leaseOwnerType(kind)}:${spec.key}`,
		owner: { ownerType: leaseOwnerType(kind), ownerId: spec.key, ownerMemberId: null },
		taskType: leaseOwnerType(kind),
		payload: { key: spec.key, data: spec.data },
		timeoutSeconds: options.startTimeoutSeconds,
		maxAttempts: options.maxFailedStarts,
		leaseSeconds: options.leaseSeconds ?? null,
	};
}

function parsePayload(task: ClaimedTask): LeasePayload {
	const { key, data } = task.payload;
	if (typeof key !== 'string' || !isRecord(data)) {
		throw new UnexpectedError('Held lease task has an invalid payload', {
			extra: { taskId: task.id },
		});
	}
	return { key, data };
}

/** Mirror the hold run's signal with the lease's own abort reasons. */
function leaseSignal(runSignal: AbortSignal): AbortSignal {
	const controller = new AbortController();
	const abort = () => controller.abort(new LeaseEndedError(endReason(runSignal.reason)));
	if (runSignal.aborted) abort();
	else runSignal.addEventListener('abort', abort, { once: true });
	return controller.signal;
}

function endReason(reason: unknown): LeaseEndReason {
	if (reason instanceof HolderShutdownError) return 'shutdown';
	if (reason instanceof TaskTimeoutError) return 'start-timeout';
	return 'lost';
}
