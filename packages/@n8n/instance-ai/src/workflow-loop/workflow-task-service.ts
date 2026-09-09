import type { WorkflowTaskService } from '../types';
import { terminalRemediationFromState } from './remediation';
import { WorkflowLoopRuntime } from './runtime';
import { canVerifyPendingSetup, isNeedsSetupRemediation } from './setup-verification-policy';
import type {
	VerificationResult,
	WorkflowBuildOutcome,
	WorkflowLoopAction,
	WorkflowLoopState,
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
		const item = await this.storage.getWorkItem(this.threadId, workItemId);
		if (!item?.lastBuildOutcome) return;

		await this.storage.saveWorkItem(this.threadId, item.state, item.attempts, {
			...item.lastBuildOutcome,
			...update,
		});
	}

	/** Clear the superseded setup blocker so verification can enter the repair loop. */
	async resumeSetupBlockedVerification(workItemId: string, runId: string): Promise<boolean> {
		// Check eligibility inside the thread mutation so overlapping requests cannot both resume.
		return await this.storage.updateWorkItem(this.threadId, workItemId, (item) => {
			if (
				!item.lastBuildOutcome ||
				item.state.runId !== runId ||
				!canVerifyPendingSetup(item.lastBuildOutcome) ||
				!isNeedsSetupRemediation(item.state.lastRemediation)
			) {
				return null;
			}

			const state: WorkflowLoopState = {
				...item.state,
				phase: 'verifying',
				status: 'active',
				lastRemediation: undefined,
			};
			if (terminalRemediationFromState(state, runId)) return null;

			return {
				...item,
				state,
				lastBuildOutcome: {
					...item.lastBuildOutcome,
					verificationReadiness: { status: 'ready' },
					remediation: isNeedsSetupRemediation(item.lastBuildOutcome.remediation)
						? undefined
						: item.lastBuildOutcome.remediation,
				},
			};
		});
	}
}
