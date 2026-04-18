import { handleBuildOutcome, handleVerificationVerdict } from './workflow-loop-controller';
import type {
	WorkflowBuildOutcome,
	VerificationResult,
	WorkflowLoopAction,
	WorkflowLoopState,
} from './workflow-loop-state';
import type { WorkflowLoopStorage } from '../storage/workflow-loop-storage';

function createInitialState(threadId: string, outcome: WorkflowBuildOutcome): WorkflowLoopState {
	return {
		workItemId: outcome.workItemId,
		threadId,
		workflowId: outcome.workflowId,
		phase: 'building',
		status: 'active',
		source: outcome.workflowId ? 'modify' : 'create',
		rebuildAttempts: 0,
	};
}

export class WorkflowLoopRuntime {
	constructor(private readonly storage: WorkflowLoopStorage) {}

	async applyBuildOutcome(
		threadId: string,
		outcome: WorkflowBuildOutcome,
	): Promise<WorkflowLoopAction> {
		const existing = await this.storage.getWorkItem(threadId, outcome.workItemId);
		const state = existing?.state ?? createInitialState(threadId, outcome);
		const attempts = existing?.attempts ?? [];

		const { state: newState, action, attempt } = handleBuildOutcome(state, attempts, outcome);
		await this.storage.saveWorkItem(threadId, newState, [...attempts, attempt], outcome);
		return action;
	}

	async applyVerificationVerdict(
		threadId: string,
		verdict: VerificationResult,
	): Promise<WorkflowLoopAction> {
		const existing = await this.storage.getWorkItem(threadId, verdict.workItemId);
		if (!existing) {
			return { type: 'blocked', reason: `Unknown work item: ${verdict.workItemId}` };
		}

		const {
			state: newState,
			action,
			attempt,
		} = handleVerificationVerdict(existing.state, existing.attempts, verdict);

		await this.storage.saveWorkItem(threadId, newState, [...existing.attempts, attempt]);
		return action;
	}
}
