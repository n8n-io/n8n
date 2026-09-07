import { UserError } from 'n8n-workflow';

import type { WorkflowTaskService } from '../types';
import { MAX_VERIFY_ATTEMPTS } from './remediation';
import { WorkflowLoopRuntime } from './runtime';
import type {
	VerificationResult,
	WorkflowBuildOutcome,
	WorkflowLoopAction,
	WorkflowLoopState,
	WorkflowVerificationEvidence,
} from './workflow-loop-state';
import type { WorkflowLoopStorage } from '../storage/workflow-loop-storage';

function lastAttemptTimeMs(
	item: NonNullable<Awaited<ReturnType<WorkflowLoopStorage['listWorkItems']>>>[number],
): number {
	const timestamp = item.attempts.at(-1)?.createdAt;
	const timeMs = Date.parse(timestamp ?? '');
	return Number.isFinite(timeMs) ? timeMs : 0;
}

export class WorkflowTaskCoordinator implements WorkflowTaskService {
	private readonly runtime: WorkflowLoopRuntime;

	constructor(
		private readonly threadId: string,
		private readonly storage: WorkflowLoopStorage,
	) {
		this.runtime = new WorkflowLoopRuntime(storage);
	}

	async reportBuildOutcome(outcome: WorkflowBuildOutcome): Promise<WorkflowLoopAction> {
		return await this.runtime.applyBuildOutcome(this.threadId, outcome);
	}

	async reportVerificationVerdict(verdict: VerificationResult): Promise<WorkflowLoopAction> {
		return await this.runtime.applyVerificationVerdict(this.threadId, verdict);
	}

	async getBuildOutcome(workItemId: string): Promise<WorkflowBuildOutcome | undefined> {
		const item = await this.storage.getWorkItem(this.threadId, workItemId);
		return item?.lastBuildOutcome ?? undefined;
	}

	async getLatestBuildOutcomeForWorkflow(
		workflowId: string,
	): Promise<WorkflowBuildOutcome | undefined> {
		const items = await this.storage.listWorkItems(this.threadId);
		const matches = items
			.filter((item) => item.lastBuildOutcome?.workflowId === workflowId)
			.filter((item) => item.lastBuildOutcome?.submitted)
			.sort((a, b) => lastAttemptTimeMs(b) - lastAttemptTimeMs(a));

		return matches[0]?.lastBuildOutcome;
	}

	async getWorkflowLoopState(workItemId: string): Promise<WorkflowLoopState | undefined> {
		const item = await this.storage.getWorkItem(this.threadId, workItemId);
		return item?.state ?? undefined;
	}

	async updateBuildOutcome(
		workItemId: string,
		update: Partial<WorkflowBuildOutcome>,
	): Promise<void> {
		await this.storage.updateBuildOutcome(this.threadId, workItemId, (outcome) => ({
			...outcome,
			...update,
		}));
	}

	/** Keep prior nodes outside storage until a successful retry restores their coverage. */
	async startVerification(workItemId: string, triggerNodeName?: string): Promise<string[]> {
		let previousNodes: string[] = [];
		await this.storage.updateBuildOutcome(this.threadId, workItemId, (outcome) => {
			if ((outcome.verifyAttempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
				throw new UserError(
					'Verification reached its attempt limit. Test the remaining nodes manually.',
				);
			}
			const progress = outcome.verificationProgress && { ...outcome.verificationProgress };
			if (progress && triggerNodeName) {
				previousNodes = Object.hasOwn(progress, triggerNodeName) ? progress[triggerNodeName] : [];
				delete progress[triggerNodeName];
			}
			return {
				...outcome,
				verifyAttempts: (outcome.verifyAttempts ?? 0) + 1,
				// An unscoped retry cannot identify which pass it replaces.
				verificationProgress: progress && !triggerNodeName ? {} : progress,
				verification: undefined,
			};
		});
		return previousNodes;
	}

	async recordVerification(
		workItemId: string,
		verification: WorkflowVerificationEvidence,
		previousNodes: string[],
	): Promise<void> {
		await this.storage.updateBuildOutcome(this.threadId, workItemId, (outcome) => {
			const trigger = verification.evidence?.triggerNodeName;
			const nodes = verification.evidence?.nodesExecuted ?? [];
			const progress = outcome.verificationProgress && { ...outcome.verificationProgress };
			if (progress && trigger) {
				if (verification.success && verification.executionId && nodes.includes(trigger)) {
					const priorNodes = Object.hasOwn(progress, trigger) ? progress[trigger] : [];
					progress[trigger] = [...new Set([...priorNodes, ...previousNodes, ...nodes])];
				} else {
					delete progress[trigger];
				}
			}
			return { ...outcome, verificationProgress: progress, verification };
		});
	}
}
