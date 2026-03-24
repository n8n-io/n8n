import type { WorkflowTaskService } from '../types';
import { WorkflowLoopRuntime } from './runtime';
import type {
	VerificationResult,
	WorkflowBuildOutcome,
	WorkflowLoopAction,
} from './workflow-loop-state';
import type { WorkflowLoopStorage } from '../storage/workflow-loop-storage';

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
}
