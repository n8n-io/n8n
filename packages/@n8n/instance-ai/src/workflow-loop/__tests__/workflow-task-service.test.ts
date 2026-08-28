import type { WorkflowLoopStorage } from '../../storage/workflow-loop-storage';
import type { WorkflowBuildOutcome } from '../workflow-loop-state';
import { WorkflowTaskCoordinator } from '../workflow-task-service';

function createStorage() {
	const records = new Map<string, Record<string, unknown>>();

	const storage = {
		getWorkItem: vi.fn(async (_threadId: string, workItemId: string) => {
			return await Promise.resolve(
				(records.get(workItemId) ?? null) as Awaited<
					ReturnType<WorkflowLoopStorage['getWorkItem']>
				>,
			);
		}),
		saveWorkItem: vi.fn(
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
		listWorkItems: vi.fn(async () => {
			return await Promise.resolve(
				Array.from(records.values()) as Awaited<ReturnType<WorkflowLoopStorage['listWorkItems']>>,
			);
		}),
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

		const action = await coordinator.reportBuildOutcome(
			createBuildOutcome({ sourceFilePath: 'src/workflows/main.workflow.ts' }),
		);

		expect(action).toEqual({
			type: 'verify',
			workflowId: 'wf-1',
		});
		expect(await coordinator.getBuildOutcome('wi_1')).toEqual(
			expect.objectContaining({
				workItemId: 'wi_1',
				workflowId: 'wf-1',
				sourceFilePath: 'src/workflows/main.workflow.ts',
			}),
		);
		expect(await coordinator.getWorkflowLoopState('wi_1')).toEqual(
			expect.objectContaining({
				sourceFilePath: 'src/workflows/main.workflow.ts',
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
		expect(await coordinator.getBuildOutcome('wi_1')).toEqual(
			expect.objectContaining({
				workItemId: 'wi_1',
				workflowId: 'wf-1',
				mockedCredentialTypes: ['slackOAuth2Api'],
			}),
		);
	});

	it('finds the latest submitted build outcome for a workflow', async () => {
		const { records, storage } = createStorage();
		const coordinator = new WorkflowTaskCoordinator('thread-1', storage);

		const baseState = {
			threadId: 'thread-1',
			runId: 'run-1',
			workflowId: 'wf-1',
			phase: 'verifying',
			status: 'active',
			source: 'modify',
			rebuildAttempts: 0,
		};
		const baseAttempt = {
			phase: 'verifying',
			action: 'build',
			result: 'success',
			workflowId: 'wf-1',
		};
		records.set('wi_old', {
			state: { ...baseState, workItemId: 'wi_old' },
			attempts: [
				{
					...baseAttempt,
					workItemId: 'wi_old',
					attempt: 1,
					createdAt: '2026-01-01T00:00:00.000Z',
				},
			],
			lastBuildOutcome: createBuildOutcome({ workItemId: 'wi_old', workflowId: 'wf-1' }),
		});
		records.set('wi_latest', {
			state: { ...baseState, workItemId: 'wi_latest' },
			attempts: [
				{
					...baseAttempt,
					workItemId: 'wi_latest',
					attempt: 1,
					createdAt: '2026-01-01T00:01:00.000Z',
				},
			],
			lastBuildOutcome: createBuildOutcome({ workItemId: 'wi_latest', workflowId: 'wf-1' }),
		});
		records.set('wi_unsubmitted', {
			state: { ...baseState, workItemId: 'wi_unsubmitted' },
			attempts: [
				{
					...baseAttempt,
					workItemId: 'wi_unsubmitted',
					attempt: 1,
					createdAt: '2026-01-01T00:02:00.000Z',
				},
			],
			lastBuildOutcome: createBuildOutcome({
				workItemId: 'wi_unsubmitted',
				workflowId: 'wf-1',
				submitted: false,
			}),
		});

		await expect(coordinator.getLatestBuildOutcomeForWorkflow('wf-1')).resolves.toMatchObject({
			workItemId: 'wi_latest',
			workflowId: 'wf-1',
		});
	});

	it('carries source file path into repair actions after verification', async () => {
		const { storage } = createStorage();
		const coordinator = new WorkflowTaskCoordinator('thread-1', storage);

		await coordinator.reportBuildOutcome(
			createBuildOutcome({ sourceFilePath: 'src/workflows/main.workflow.ts' }),
		);
		const action = await coordinator.reportVerificationVerdict({
			workItemId: 'wi_1',
			workflowId: 'wf-1',
			verdict: 'needs_patch',
			failedNodeName: 'HTTP Request',
			diagnosis: 'Invalid URL',
			summary: 'Workflow needs repair.',
		});

		expect(action).toMatchObject({
			type: 'patch',
			sourceFilePath: 'src/workflows/main.workflow.ts',
		});
	});

	it('ignores stale build outcomes without overwriting the current work item', async () => {
		const { storage } = createStorage();
		const coordinator = new WorkflowTaskCoordinator('thread-1', storage);

		await coordinator.reportBuildOutcome(createBuildOutcome({ runId: 'run-current' }));
		const action = await coordinator.reportBuildOutcome(
			createBuildOutcome({
				runId: 'run-previous',
				submitted: false,
				failureSignature: 'old validation failure',
			}),
		);

		expect(action.type).toBe('ignored');
		expect(storage.saveWorkItem).toHaveBeenCalledTimes(1);
		expect(await coordinator.getBuildOutcome('wi_1')).toEqual(
			expect.objectContaining({
				runId: 'run-current',
				submitted: true,
			}),
		);
	});

	it('ignores stale verification verdicts without overwriting the current work item', async () => {
		const { storage } = createStorage();
		const coordinator = new WorkflowTaskCoordinator('thread-1', storage);

		await coordinator.reportBuildOutcome(createBuildOutcome({ runId: 'run-current' }));
		const action = await coordinator.reportVerificationVerdict({
			workItemId: 'wi_1',
			runId: 'run-previous',
			workflowId: 'wf-1',
			verdict: 'verified',
			summary: 'Old run finished.',
		});

		expect(action.type).toBe('ignored');
		expect(storage.saveWorkItem).toHaveBeenCalledTimes(1);
		expect(await coordinator.getWorkflowLoopState('wi_1')).toEqual(
			expect.objectContaining({
				runId: 'run-current',
				phase: 'verifying',
				status: 'active',
			}),
		);
	});
});
