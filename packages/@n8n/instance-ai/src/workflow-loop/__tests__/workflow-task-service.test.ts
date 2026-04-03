import type { WorkflowLoopStorage } from '../../storage/workflow-loop-storage';
import type { WorkflowBuildOutcome } from '../workflow-loop-state';
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

function createBuildOutcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
	return {
		workItemId: 'wi_1',
		taskId: 'build-1',
		workflowId: 'wf-1',
		submitted: true,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		summary: 'Workflow submitted.',
		...overrides,
	};
}

describe('WorkflowTaskCoordinator', () => {
	it('persists build outcomes and returns the next action', async () => {
		const { storage } = createStorage();
		const coordinator = new WorkflowTaskCoordinator('thread-1', storage);

		const action = await coordinator.reportBuildOutcome(createBuildOutcome());

		expect(action).toEqual({
			type: 'verify',
			workflowId: 'wf-1',
		});
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

		await coordinator.reportBuildOutcome(createBuildOutcome());
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
