import type { WorkflowLoopStorage } from '../../storage/workflow-loop-storage';
import type { WorkflowBuildOutcome, WorkflowSourceArtifact } from '../workflow-loop-state';
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

function createSourceArtifact(
	overrides: Partial<WorkflowSourceArtifact> = {},
): WorkflowSourceArtifact {
	return {
		sourceRef: 'wfsrc_wi_1_abc12345',
		threadId: 'thread-1',
		runId: 'run-1',
		workItemId: 'wi_1',
		taskId: 'build-1',
		workflowId: 'wf-1',
		workflowName: 'Workflow submitted',
		filePath: 'src/workflows/build-1/main.workflow.ts',
		sourceHash: 'hash-1',
		workflowVersionId: 'version-1',
		lastSuccessfulBuildAt: '2026-01-01T00:00:00Z',
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
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
		expect(await coordinator.getBuildOutcome('wi_1')).toEqual(
			expect.objectContaining({
				workItemId: 'wi_1',
				workflowId: 'wf-1',
				mockedCredentialTypes: ['slackOAuth2Api'],
			}),
		);
	});

	it('preserves source artifact metadata across coordinator recreation', async () => {
		const { storage } = createStorage();
		const sourceArtifact = createSourceArtifact({
			sourceRef: 'wfsrc_wi_1_repair',
			sourceHash: 'hash-before-repair',
		});
		const coordinator = new WorkflowTaskCoordinator('thread-1', storage);

		await coordinator.reportBuildOutcome(createBuildOutcome({ sourceArtifact }));

		const recreatedCoordinator = new WorkflowTaskCoordinator('thread-1', storage);
		await recreatedCoordinator.updateBuildOutcome('wi_1', {
			sourceArtifact: {
				...sourceArtifact,
				sourceHash: 'hash-after-repair',
				lastFailedBuildAt: '2026-01-01T00:01:00Z',
			},
		});

		const storedOutcome = await recreatedCoordinator.getBuildOutcome('wi_1');
		expect(storedOutcome?.sourceArtifact).toMatchObject({
			sourceRef: 'wfsrc_wi_1_repair',
			filePath: 'src/workflows/build-1/main.workflow.ts',
			sourceHash: 'hash-after-repair',
			lastFailedBuildAt: '2026-01-01T00:01:00Z',
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
