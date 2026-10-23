import type { Logger } from '@n8n/backend-common';
import type { ScheduledJobOwner } from '@n8n/db';
import type {
	ClaimedTask,
	HoldReporter,
	HoldRun,
	HoldTaskHandler,
	ScheduledJobOwnerResolver,
} from '@n8n/scheduler';

import type { HeldJob, HeldTaskProvisioner } from '../held-task-provisioner';

export const TEST_HOLDER_TASK_TYPE = 'internal:test-holder';
export const TEST_HOLDER_OWNER_TYPE = 'test-holder';

/** Settings read from the environment. Present only when `N8N_SCHEDULER_TEST_HOLDERS` is set. */
export interface TestHolderSettings {
	count: number;
	leaseSeconds: number | null;
	startTimeoutSeconds: number;
}

export function readTestHolderSettings(env = process.env): TestHolderSettings | undefined {
	const count = Number(env.N8N_SCHEDULER_TEST_HOLDERS);
	if (!Number.isInteger(count) || count < 1) return undefined;
	const leaseSeconds = Number(env.N8N_SCHEDULER_TEST_HOLDER_LEASE_SECONDS);
	return {
		count,
		leaseSeconds: Number.isInteger(leaseSeconds) && leaseSeconds > 0 ? leaseSeconds : null,
		startTimeoutSeconds: 30,
	};
}

/**
 * A holder with no external effect. It arms an in-process timer, reports ready,
 * keeps it until told to let go, then disarms. Every arm and disarm is logged with
 * the host, the task id and the lease epoch, so tests can trace ownership.
 */
export class TestHolder implements HoldTaskHandler {
	readonly mode = 'hold';

	readonly armed = new Map<string, { epoch: number; since: number }>();

	constructor(
		private readonly hostId: string,
		private readonly logger: Logger,
	) {}

	async hold(task: ClaimedTask, holder: HoldReporter, run: HoldRun): Promise<void> {
		const resource = setInterval(() => {}, 60_000);
		this.armed.set(task.id, { epoch: task.leaseEpoch, since: Date.now() });
		this.logger.info('Test holder armed', this.context(task));
		try {
			await holder.ready();
			if (!run.signal.aborted) {
				await new Promise<void>((resolve) => {
					run.signal.addEventListener('abort', () => resolve(), { once: true });
				});
			}
		} finally {
			clearInterval(resource);
			this.armed.delete(task.id);
			const reason: unknown = run.signal.reason;
			this.logger.info('Test holder disarmed', {
				...this.context(task),
				reason: reason instanceof Error ? reason.name : 'returned',
			});
		}
	}

	private context(task: ClaimedTask) {
		return {
			host: this.hostId,
			taskId: task.id,
			jobId: task.jobId,
			epoch: task.leaseEpoch,
			at: new Date().toISOString(),
		};
	}
}

/** Owns the test hold jobs: `test-holder-0` up to `test-holder-<count - 1>`. */
export class TestHolderOwner implements ScheduledJobOwnerResolver {
	constructor(private readonly settings: TestHolderSettings) {}

	owner(index: number): ScheduledJobOwner {
		return {
			ownerType: TEST_HOLDER_OWNER_TYPE,
			ownerId: `test-holder-${index}`,
			ownerMemberId: null,
		};
	}

	async findExisting(ownerIds: string[]): Promise<Set<string>> {
		const live = new Set(
			Array.from({ length: this.settings.count }, (_, index) => this.owner(index).ownerId),
		);
		return new Set(ownerIds.filter((id) => live.has(id)));
	}

	jobs(): HeldJob[] {
		return Array.from({ length: this.settings.count }, (_, index) => ({
			name: `test-holder:${index}`,
			owner: this.owner(index),
			taskType: TEST_HOLDER_TASK_TYPE,
			payload: { index },
			timeoutSeconds: this.settings.startTimeoutSeconds,
			maxAttempts: 5,
			leaseSeconds: this.settings.leaseSeconds,
		}));
	}

	async provision(provisioner: HeldTaskProvisioner): Promise<number> {
		return (await provisioner.provision(this.jobs())).length;
	}
}
