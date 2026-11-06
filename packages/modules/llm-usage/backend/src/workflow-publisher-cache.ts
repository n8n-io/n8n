import { Time } from '@n8n/constants';
import { WorkflowPublishHistoryRepository } from '@n8n/db';
import { Service } from '@n8n/di';

const TTL_MS = 10 * Time.minutes.toMilliseconds;

/**
 * The publisher of each workflow. A production run on a worker has no user, so budgets count
 * its calls for the publisher. Reads never wait for the database: a call is checked before it
 * is sent.
 */
@Service()
export class WorkflowPublisherCache {
	private readonly entries = new Map<string, { userId?: string; expiresAt: number }>();

	private readonly loading = new Set<string>();

	constructor(private readonly publishHistory: WorkflowPublishHistoryRepository) {}

	/** The user that budgets count: who started the run, else who published the workflow. */
	accountableUserId({
		userId,
		workflowId,
	}: { userId?: string | null; workflowId?: string | null }) {
		return userId ?? (workflowId ? this.get(workflowId) : undefined);
	}

	/** The cached publisher. A miss or an old entry is loaded in the background for the next call. */
	get(workflowId: string): string | undefined {
		const entry = this.entries.get(workflowId);
		if (!entry || entry.expiresAt <= Date.now()) void this.load(workflowId);
		return entry?.userId;
	}

	private async load(workflowId: string) {
		if (this.loading.has(workflowId)) return;
		this.loading.add(workflowId);
		try {
			const userId = await this.publishHistory.findPublisherUserId(workflowId);
			this.entries.set(workflowId, { userId, expiresAt: Date.now() + TTL_MS });
		} catch {
			// The call keeps no accountable user, and the next call tries again.
		} finally {
			this.loading.delete(workflowId);
		}
	}
}
