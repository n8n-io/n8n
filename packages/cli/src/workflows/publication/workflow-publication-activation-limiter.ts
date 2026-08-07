import { WorkflowsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import pLimit from 'p-limit';

/**
 * The one concurrency budget for workflow publication activation work. Every
 * path that (de)registers triggers in bulk — the outbox consumer's drain
 * workers, and reconciliation's direct re-registrations — runs each unit of
 * work through {@link run}, so their combined parallelism never exceeds
 * `N8N_WORKFLOW_PUBLICATION_CONCURRENCY` no matter how many paths are active
 * at once. Queueing is FIFO and a throwing task releases its slot (p-limit).
 *
 * Ordering rule: acquire a slot here BEFORE taking a workflow's
 * {@link WorkflowPublicationLifecycleLock}, never the other way around — a
 * slot is never re-acquired while a lifecycle lock is held, so the two can't
 * deadlock. Callers should also do all their work inside the slot (e.g. the
 * consumer claims a record inside it): taking ownership of work and then
 * waiting for a slot would strand that work while the budget is busy.
 */
@Service()
export class WorkflowPublicationActivationLimiter {
	private limit: pLimit.Limit;

	constructor(private readonly workflowsConfig: WorkflowsConfig) {
		this.limit = pLimit(this.workflowsConfig.workflowPublicationConcurrency);
	}

	/** Runs `fn` once a slot is free, holding the slot until it settles. */
	async run<T>(fn: () => Promise<T>): Promise<T> {
		return await this.limit(fn);
	}
}
