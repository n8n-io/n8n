import type { ManagedBackgroundTask } from '../../runtime/background-task-manager';
import type { WorkflowLoopStorage } from '../../storage/workflow-loop-storage';
import { WorkflowTaskCoordinator } from '../workflow-task-service';

function createStorage() {
	const records = new Map<string, Record<string, unknown>>();

	const storage = {
		getWorkItem: jest.fn(async (_threadId: string, workItemId: string) => {
			return await Promise.resolve(
				(records.get(workItemId) ?? null) as Awaited<
					ReturnType<WorkflowLoopStorage['getWorkItem']>
				>,
			);
		}),
		saveWorkItem: jest.fn(
			async (
				_threadId: string,
				state: Record<string, unknown>,
				attempts: unknown[],
				lastBuildOutcome?: Record<string, unknown>,
			) => {
				records.set(String(state.workItemId), {
					state,
					attempts,
					...(lastBuildOutcome ? { lastBuildOutcome } : {}),
				});
				await Promise.resolve();
			},
		),
	} as unknown as WorkflowLoopStorage;

	return { records, storage };
}

function createBuilderTask(overrides: Partial<ManagedBackgroundTask> = {}): ManagedBackgroundTask {
	return {
		taskId: 'build-1',
		threadId: 'thread-1',
		runId: 'run-1',
		role: 'workflow-builder',
		agentId: 'agent-builder-1',
		status: 'completed',
		result: 'Workflow submitted.',
		startedAt: Date.now(),
		abortController: new AbortController(),
		corrections: [],
		chainDepth: 1,
		outcome: {
			workItemId: 'wi_1',
			taskId: 'build-1',
			workflowId: 'wf-1',
			submitted: true,
			triggerType: 'manual_or_testable',
			needsUserInput: false,
			summary: 'Workflow submitted.',
		},
		...overrides,
	};
}

describe('WorkflowTaskCoordinator', () => {
	it('formats builder completions with deterministic verification guidance', async () => {
		const { storage } = createStorage();
		const coordinator = new WorkflowTaskCoordinator('thread-1', storage);

		const message = await coordinator.formatCompletedTaskMessage(createBuilderTask());

		expect(message).toContain('[Background task completed');
		expect(message).toContain('VERIFY: Run workflow wf-1.');
		expect(await coordinator.getBuildOutcome('wi_1')).toEqual(
			expect.objectContaining({
				workItemId: 'wi_1',
				workflowId: 'wf-1',
			}),
		);
	});

	it('updates stored build outcomes and resolves verification verdicts', async () => {
		const { storage } = createStorage();
		const coordinator = new WorkflowTaskCoordinator('thread-1', storage);

		await coordinator.formatCompletedTaskMessage(createBuilderTask());
		await coordinator.updateBuildOutcome('wi_1', {
			mockedCredentialTypes: ['slackOAuth2Api'],
		});

		expect(await coordinator.getBuildOutcome('wi_1')).toEqual(
			expect.objectContaining({
				mockedCredentialTypes: ['slackOAuth2Api'],
			}),
		);

		const action = await coordinator.reportVerificationVerdict({
			workItemId: 'wi_1',
			workflowId: 'wf-1',
			verdict: 'verified',
			summary: 'Workflow ran successfully.',
		});

		expect(action).toEqual(
			expect.objectContaining({
				type: 'done',
				workflowId: 'wf-1',
			}),
		);
	});
});
