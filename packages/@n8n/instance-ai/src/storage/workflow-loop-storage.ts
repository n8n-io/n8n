import { z } from 'zod';

import { getThread, patchThread, type PatchableThreadMemory } from './thread-patch';
import type {
	AttemptRecord,
	WorkflowBuildOutcome,
	WorkflowLoopState,
} from '../workflow-loop/workflow-loop-state';
import {
	attemptRecordSchema,
	isPlannedWorkflowBuildOwner,
	resolveWorkflowBuildOwner,
	workflowBuildOutcomeSchema,
	workflowLoopStateSchema,
} from '../workflow-loop/workflow-loop-state';

const METADATA_KEY = 'instanceAiWorkflowLoop';

const workItemRecordSchema = z.object({
	state: workflowLoopStateSchema,
	attempts: z.array(attemptRecordSchema),
	lastBuildOutcome: workflowBuildOutcomeSchema.optional(),
});

const loopStorageSchema = z.record(z.string(), workItemRecordSchema);

export type WorkflowLoopWorkItemRecord = z.infer<typeof workItemRecordSchema>;

/**
 * Distinct workflow ids the loop recorded on this thread's metadata, from work
 * item state and build outcomes. The loop writes these deterministically from
 * actual build results, so they are trustworthy where a model-retyped id is not.
 */
export function collectLoopWorkflowIds(metadata: Record<string, unknown>): string[] {
	const parsed = loopStorageSchema.safeParse(metadata[METADATA_KEY]);
	if (!parsed.success) return [];
	const ids = new Set<string>();
	for (const { state, lastBuildOutcome } of Object.values(parsed.data)) {
		if (state.workflowId) ids.add(state.workflowId);
		if (lastBuildOutcome?.workflowId) ids.add(lastBuildOutcome.workflowId);
	}
	return [...ids];
}

export interface WorkflowSetupRoutingClaim {
	claimId: string;
	claimedAt: string;
	expiresAt: string;
}

function clearSetupRoutingClaim(state: WorkflowLoopState): WorkflowLoopState {
	const next: WorkflowLoopState = { ...state };
	delete next.setupRoutingClaimId;
	delete next.setupRoutingClaimedAt;
	delete next.setupRoutingClaimExpiresAt;
	return next;
}

function hasUnexpiredSetupRoutingClaim(state: WorkflowLoopState, nowIso: string): boolean {
	if (!state.setupRoutingClaimId) return false;

	const expiresAtMs = Date.parse(state.setupRoutingClaimExpiresAt ?? '');
	if (!Number.isFinite(expiresAtMs)) return true;

	return expiresAtMs > Date.parse(nowIso);
}

function isPlannedWorkItem(record: WorkflowLoopWorkItemRecord): boolean {
	return isPlannedWorkflowBuildOwner(
		resolveWorkflowBuildOwner(record.state, record.lastBuildOutcome),
	);
}

export class WorkflowLoopStorage {
	constructor(private readonly memory: PatchableThreadMemory) {}

	async getWorkItem(
		threadId: string,
		workItemId: string,
	): Promise<WorkflowLoopWorkItemRecord | null> {
		const all = await this.loadAll(threadId);
		return all[workItemId] ?? null;
	}

	async saveWorkItem(
		threadId: string,
		state: WorkflowLoopState,
		attempts: AttemptRecord[],
		lastBuildOutcome?: WorkflowBuildOutcome,
	): Promise<void> {
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const all = this.parse(metadata[METADATA_KEY]);
				all[state.workItemId] = { state, attempts, lastBuildOutcome };
				return {
					metadata: {
						...metadata,
						[METADATA_KEY]: all,
					},
				};
			},
		});
	}

	async getActiveWorkItem(threadId: string): Promise<WorkflowLoopWorkItemRecord | null> {
		const all = await this.loadAll(threadId);
		for (const record of Object.values(all)) {
			if (record.state.status === 'active') {
				return record;
			}
		}
		return null;
	}

	async listWorkItems(threadId: string): Promise<WorkflowLoopWorkItemRecord[]> {
		const all = await this.loadAll(threadId);
		return Object.values(all);
	}

	async claimSetupRouting(
		threadId: string,
		workItemId: string,
		claim: WorkflowSetupRoutingClaim,
	): Promise<WorkflowLoopWorkItemRecord | null> {
		let claimed: WorkflowLoopWorkItemRecord | null = null;
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const all = this.parse(metadata[METADATA_KEY]);
				const record = all[workItemId];
				if (!record) return null;
				if (record.state.setupRoutedAt || isPlannedWorkItem(record)) return null;
				if (hasUnexpiredSetupRoutingClaim(record.state, claim.claimedAt)) return null;

				const state: WorkflowLoopState = {
					...record.state,
					setupRoutingClaimId: claim.claimId,
					setupRoutingClaimedAt: claim.claimedAt,
					setupRoutingClaimExpiresAt: claim.expiresAt,
				};
				claimed = { state, attempts: record.attempts, lastBuildOutcome: record.lastBuildOutcome };
				all[workItemId] = claimed;
				return {
					metadata: {
						...metadata,
						[METADATA_KEY]: all,
					},
				};
			},
		});
		return claimed;
	}

	async markSetupRouted(
		threadId: string,
		workItemId: string,
		claimId: string,
		routedAt: string,
	): Promise<boolean> {
		let marked = false;
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const all = this.parse(metadata[METADATA_KEY]);
				const record = all[workItemId];
				if (!record) return null;
				if (record.state.setupRoutedAt || isPlannedWorkItem(record)) return null;
				if (record.state.setupRoutingClaimId !== claimId) return null;

				all[workItemId] = {
					state: {
						...clearSetupRoutingClaim(record.state),
						setupRoutedAt: routedAt,
					},
					attempts: record.attempts,
					lastBuildOutcome: record.lastBuildOutcome,
				};
				marked = true;
				return {
					metadata: {
						...metadata,
						[METADATA_KEY]: all,
					},
				};
			},
		});
		return marked;
	}

	async releaseSetupRoutingClaim(
		threadId: string,
		workItemId: string,
		claimId: string,
	): Promise<void> {
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const all = this.parse(metadata[METADATA_KEY]);
				const record = all[workItemId];
				if (!record || record.state.setupRoutingClaimId !== claimId) return null;

				all[workItemId] = {
					state: clearSetupRoutingClaim(record.state),
					attempts: record.attempts,
					lastBuildOutcome: record.lastBuildOutcome,
				};
				return {
					metadata: {
						...metadata,
						[METADATA_KEY]: all,
					},
				};
			},
		});
	}

	private async loadAll(threadId: string): Promise<Record<string, WorkflowLoopWorkItemRecord>> {
		const thread = await getThread(this.memory, threadId);
		if (!thread?.metadata?.[METADATA_KEY]) return {};
		return this.parse(thread.metadata[METADATA_KEY]);
	}

	private parse(raw: unknown): Record<string, WorkflowLoopWorkItemRecord> {
		const result = loopStorageSchema.safeParse(raw);
		return result.success ? result.data : {};
	}
}
