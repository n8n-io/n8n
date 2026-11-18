import type { AquariumActivity } from '@n8n/api-types';
import { WorkflowSharingService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import {
	OnLifecycleEvent,
	type WorkflowExecuteAfterContext,
	type WorkflowExecuteBeforeContext,
	type WorkflowExecuteResumeContext,
} from '@n8n/decorators';
import { Service } from '@n8n/di';

import { ActivityTracker } from './activity-tracker';
import {
	ACTIVITY_WINDOW_SECONDS,
	MAX_RUNNING_MS,
	PRUNE_INTERVAL_MS,
	READABLE_WORKFLOWS_CACHE_MS,
} from './aquarium.constants';

/**
 * Counts the runs of this process only. With more than one main instance, each one knows
 * only the runs that it started or queued.
 */
@Service()
export class AquariumActivityService {
	private readonly tracker = new ActivityTracker(ACTIVITY_WINDOW_SECONDS, MAX_RUNNING_MS);

	private readonly readableCache = new Map<string, { ids: Set<string>; expiresAt: number }>();

	private pruneTimer: NodeJS.Timeout | undefined;

	constructor(private readonly workflowSharingService: WorkflowSharingService) {}

	start(): void {
		this.pruneTimer = setInterval(() => this.tracker.prune(Date.now()), PRUNE_INTERVAL_MS);
		this.pruneTimer.unref();
	}

	shutdown(): void {
		clearInterval(this.pruneTimer);
		this.pruneTimer = undefined;
	}

	@OnLifecycleEvent('workflowExecuteBefore')
	onWorkflowExecuteBefore(ctx: WorkflowExecuteBeforeContext): void {
		if (!ctx.workflow.id) return;
		this.tracker.recordStarted(ctx.workflow.id, ctx.executionId, Date.now());
	}

	@OnLifecycleEvent('workflowExecuteResume')
	onWorkflowExecuteResume(ctx: WorkflowExecuteResumeContext): void {
		if (!ctx.workflow.id) return;
		this.tracker.recordResumed(ctx.workflow.id, ctx.executionId, Date.now());
	}

	@OnLifecycleEvent('workflowExecuteAfter')
	onWorkflowExecuteAfter(ctx: WorkflowExecuteAfterContext): void {
		if (!ctx.workflow.id) return;
		this.tracker.recordEnded(ctx.workflow.id, ctx.executionId, ctx.runData.status, Date.now());
	}

	/** Returns only the workflows that the user can read. */
	async getActivity(user: User, now = Date.now()): Promise<AquariumActivity> {
		const snapshot = this.tracker.snapshot(now);
		// No activity means no workflow to filter, so skip the query.
		const readable =
			snapshot.length > 0 ? await this.readableWorkflowIds(user, now) : new Set<string>();

		return {
			windowSeconds: this.tracker.windowSeconds,
			generatedAt: new Date(now).toISOString(),
			workflows: snapshot
				.filter((activity) => readable.has(activity.workflowId))
				.map((activity) => ({
					...activity,
					lastEventAt: new Date(activity.lastEventAt).toISOString(),
				})),
		};
	}

	private async readableWorkflowIds(user: User, now: number): Promise<Set<string>> {
		const cached = this.readableCache.get(user.id);
		if (cached && cached.expiresAt > now) return cached.ids;

		const ids = new Set(
			await this.workflowSharingService.getSharedWorkflowIds(user, { scopes: ['workflow:read'] }),
		);
		this.readableCache.set(user.id, { ids, expiresAt: now + READABLE_WORKFLOWS_CACHE_MS });
		return ids;
	}
}
