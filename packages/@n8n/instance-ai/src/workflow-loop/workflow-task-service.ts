import type { ManagedBackgroundTask } from '../runtime/background-task-manager';
import type { WorkflowTaskService } from '../types';
import { formatWorkflowLoopGuidance } from './guidance';
import { WorkflowLoopRuntime } from './runtime';
import { workflowBuildOutcomeSchema } from './workflow-loop-state';
import type {
	VerificationResult,
	WorkflowBuildOutcome,
	WorkflowLoopAction,
} from './workflow-loop-state';
import type { WorkflowLoopStorage } from '../storage/workflow-loop-storage';

function parseBuildOutcome(raw: unknown): WorkflowBuildOutcome | undefined {
	const result = workflowBuildOutcomeSchema.safeParse(raw);
	return result.success ? result.data : undefined;
}

export class WorkflowTaskCoordinator implements WorkflowTaskService {
	private readonly runtime: WorkflowLoopRuntime;

	constructor(
		private readonly threadId: string,
		private readonly storage: WorkflowLoopStorage,
	) {
		this.runtime = new WorkflowLoopRuntime(storage);
	}

	async formatCompletedTaskMessage(task: ManagedBackgroundTask): Promise<string> {
		let resultLine = `[Background task completed — ${task.role}]: ${task.result ?? ''}`;
		if (task.role !== 'workflow-builder') return resultLine;

		const outcome = parseBuildOutcome(task.outcome);
		if (!outcome) {
			resultLine +=
				'\n\nVERIFICATION: If a workflow was built, run it to verify before reporting to the user.';
			return resultLine;
		}

		const action = await this.runtime.applyBuildOutcome(this.threadId, outcome);
		resultLine += `\n\n${formatWorkflowLoopGuidance(action, { workItemId: outcome.workItemId })}`;
		return resultLine;
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
