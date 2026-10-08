import { UserError } from 'n8n-workflow';
import { isDeepStrictEqual } from 'node:util';

import type { WorkflowTaskService } from '../types';
import { MAX_VERIFY_ATTEMPTS, terminalRemediationFromState } from './remediation';
import { WorkflowLoopRuntime } from './runtime';
import {
	isNeedsSetupRemediation,
	stateForPendingSetupVerification,
} from './setup-verification-policy';
import { deriveWorkflowVerificationClaim } from './verification-progress';
import type {
	VerificationResult,
	VerificationClaim,
	WorkflowVerificationEvidence,
	WorkflowTriggerVerificationProgress,
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
		await this.storage.updateWorkItem(this.threadId, workItemId, (item) => {
			if (!item.lastBuildOutcome) return null;
			return { ...item, lastBuildOutcome: { ...item.lastBuildOutcome, ...update } };
		});
	}

	/** Bind verification and its later verdict to the build and state that the caller read. */
	async beginVerification(
		outcome: WorkflowBuildOutcome,
		expectedState: WorkflowLoopState,
		runId: string,
	): Promise<boolean> {
		return await this.storage.updateWorkItem(this.threadId, outcome.workItemId, (item) => {
			if (
				!item.lastBuildOutcome ||
				!isDeepStrictEqual(item.lastBuildOutcome, outcome) ||
				!isDeepStrictEqual(item.state, expectedState)
			) {
				return null;
			}

			const setupState = stateForPendingSetupVerification(item.state, outcome, runId);
			if (outcome.verificationReadiness?.status === 'needs_setup' && !setupState) return null;
			const state = setupState ?? item.state;
			if (
				(setupState || state.status === 'blocked' || state.lastRemediation?.shouldEdit === false) &&
				terminalRemediationFromState(state)
			)
				return null;

			return {
				...item,
				state: { ...state, runId, phase: 'verifying', status: 'active' },
				lastBuildOutcome: setupState
					? {
							...outcome,
							verificationReadiness: { status: 'ready' },
							remediation: isNeedsSetupRemediation(outcome.remediation)
								? undefined
								: outcome.remediation,
						}
					: outcome,
			};
		});
	}

	/** Keep prior evidence outside storage until a successful retry restores it. */
	async startVerification(
		workItemId: string,
		triggerNodeName?: string,
	): Promise<WorkflowTriggerVerificationProgress | undefined> {
		let previousProgress: WorkflowTriggerVerificationProgress | undefined;
		await this.storage.updateBuildOutcome(this.threadId, workItemId, (outcome) => {
			if ((outcome.verifyAttempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
				throw new UserError(
					'Verification reached its attempt limit. Test the remaining nodes manually.',
				);
			}
			const progress = outcome.verificationProgress && { ...outcome.verificationProgress };
			if (progress && triggerNodeName) {
				previousProgress = Object.hasOwn(progress, triggerNodeName)
					? progress[triggerNodeName]
					: undefined;
				delete progress[triggerNodeName];
			}
			return {
				...outcome,
				verifyAttempts: (outcome.verifyAttempts ?? 0) + 1,
				// An unscoped retry cannot identify which pass it replaces.
				verificationProgress: progress && !triggerNodeName ? {} : progress,
				// Keep the obligation open and block publishing until the run completes.
				verification: { attempted: false, success: false, status: 'running' },
			};
		});
		return previousProgress;
	}

	async recordVerification(
		workItemId: string,
		verification: WorkflowVerificationEvidence & { claim: VerificationClaim },
		previousProgress?: WorkflowTriggerVerificationProgress,
	): Promise<VerificationClaim | undefined> {
		let claim: VerificationClaim | undefined;
		await this.storage.updateBuildOutcome(this.threadId, workItemId, (outcome) => {
			const trigger = verification.evidence?.triggerNodeName;
			const nodes = verification.evidence?.nodesExecuted ?? [];
			const progress = outcome.verificationProgress && { ...outcome.verificationProgress };
			if (progress && trigger) {
				if (verification.success && verification.executionId && nodes.includes(trigger)) {
					const priorProgress = Object.hasOwn(progress, trigger) ? progress[trigger] : [];
					progress[trigger] = [
						...new Map(
							[...(previousProgress ?? []), ...priorProgress, verification].map((pass) => [
								pass.executionId,
								pass,
							]),
						).values(),
					];
				} else {
					delete progress[trigger];
				}
			}
			const next = { ...outcome, verificationProgress: progress };
			claim = deriveWorkflowVerificationClaim(next, verification);
			return { ...next, verification: { ...verification, claim } };
		});
		return claim;
	}
}
