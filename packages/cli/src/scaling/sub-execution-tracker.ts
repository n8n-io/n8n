import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import type { Job } from './scaling.types';

type TrackedJob = {
	job: Job;
	subExecutionIds: Set<string>;
	/** The last write, so writes for one job reach Redis in order. */
	lastWrite: Promise<void>;
	writeQueued: boolean;
	ended: boolean;
};

/**
 * Records on each job the sub-executions that run inside it on this worker.
 *
 * A sub-execution runs in its parent's process and has no job of its own. Queue recovery marks
 * every in-progress execution without a live job as crashed, so it reads these ids too.
 * The writes run in the background: a failed write only means that the next recovery pass
 * may mark the sub-execution as crashed.
 */
@Service()
export class SubExecutionTracker {
	/** The job that each execution in this process runs inside, whether its own or its root's. */
	private readonly jobByExecutionId = new Map<string, TrackedJob>();

	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('scaling');
	}

	startJob(job: Job) {
		this.jobByExecutionId.set(job.data.executionId, {
			job,
			subExecutionIds: new Set(),
			lastWrite: Promise.resolve(),
			writeQueued: false,
			ended: false,
		});
	}

	endJob(job: Job) {
		const tracked = this.jobByExecutionId.get(job.data.executionId);
		if (!tracked) return;

		tracked.ended = true;
		this.jobByExecutionId.delete(job.data.executionId);
		for (const id of tracked.subExecutionIds) this.jobByExecutionId.delete(id);
	}

	/** Does nothing when the parent does not run inside a job in this process. */
	addSubExecution(executionId: string, parentExecutionId: string | undefined) {
		if (parentExecutionId === undefined) return;
		const tracked = this.jobByExecutionId.get(parentExecutionId);
		if (!tracked) return;

		this.jobByExecutionId.set(executionId, tracked);
		tracked.subExecutionIds.add(executionId);
		this.queueWrite(tracked);
	}

	removeSubExecution(executionId: string) {
		const tracked = this.jobByExecutionId.get(executionId);
		if (!tracked?.subExecutionIds.has(executionId)) return;

		this.jobByExecutionId.delete(executionId);
		tracked.subExecutionIds.delete(executionId);
		this.queueWrite(tracked);
	}

	/** One write covers every change made before it starts, so a burst of sub-executions costs one write. */
	private queueWrite(tracked: TrackedJob) {
		if (tracked.writeQueued) return;
		tracked.writeQueued = true;

		tracked.lastWrite = tracked.lastWrite
			.then(async () => {
				tracked.writeQueued = false;
				if (tracked.ended) return;
				await tracked.job.update({
					...tracked.job.data,
					subExecutionIds: [...tracked.subExecutionIds],
				});
			})
			.catch((error: unknown) => {
				this.logger.warn('Failed to record the sub-executions of a job', {
					jobId: tracked.job.id,
					executionId: tracked.job.data.executionId,
					error: ensureError(error).message,
				});
			});
	}
}
