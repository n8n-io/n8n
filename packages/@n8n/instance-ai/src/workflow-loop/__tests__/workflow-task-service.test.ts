import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { WorkflowLoopStorage } from '../../storage/workflow-loop-storage';
import { createReportVerificationVerdictTool } from '../../tools/orchestration/report-verification-verdict.tool';
import { createVerifyBuiltWorkflowTool } from '../../tools/orchestration/verify-built-workflow.tool';
import type { OrchestrationContext, InstanceAiContext } from '../../types';
import { MAX_POST_SUBMIT_REMEDIATION_SUBMITS } from '../remediation';
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
	function setupBlockedOutcome(overrides: Partial<WorkflowBuildOutcome> = {}) {
		return createBuildOutcome({
			runId: 'run-1',
			needsUserInput: true,
			nodeSimulationPlan: [],
			verificationReadiness: {
				status: 'needs_setup',
				reason: 'workflow-needs-setup',
				guidance: 'Connect the account.',
			},
			remediation: { category: 'needs_setup', shouldEdit: false, guidance: 'Connect the account.' },
			sourceFilePath: 'src/workflows/main.workflow.ts',
			...overrides,
		});
	}

	it.each([true, false])(
		'preserves the repair path with setup panel enabled=%s',
		async (setupPanelEnabled) => {
			const { storage } = createStorage();
			const coordinator = new WorkflowTaskCoordinator('thread-1', storage);
			await coordinator.reportBuildOutcome(setupBlockedOutcome());
			const previous = await storage.getWorkItem('thread-1', 'wi_1');
			const run = vi.fn().mockResolvedValue({
				executionId: 'exec-1',
				status: 'error',
				error: 'Invalid expression',
				nodeErrors: [{ nodeName: 'Transform', message: 'Invalid expression' }],
			});
			const context = mock<OrchestrationContext>({
				runId: 'run-1',
				setupPanelEnabled,
				workflowTaskService: coordinator,
				logger: mock<OrchestrationContext['logger']>(),
				domainContext: mock<InstanceAiContext>({
					executionService: mock<InstanceAiContext['executionService']>({ run }),
					workflowService: mock<InstanceAiContext['workflowService']>({
						getAsWorkflowJSON: vi.fn().mockResolvedValue({ nodes: [], connections: {} }),
					}),
				}),
			});

			const result = await executeTool(createVerifyBuiltWorkflowTool(context), {
				workItemId: 'wi_1',
				workflowId: 'wf-1',
			});
			if (!setupPanelEnabled) {
				expect(run).not.toHaveBeenCalled();
				expect(result.remediation).toMatchObject({ category: 'needs_setup' });
				expect(await storage.getWorkItem('thread-1', 'wi_1')).toEqual(previous);
				return;
			}
			expect(run).toHaveBeenCalledOnce();
			expect(result.remediation).toMatchObject({ category: 'code_fixable', shouldEdit: true });
			const afterRun = await storage.getWorkItem('thread-1', 'wi_1');
			expect(afterRun?.state).toMatchObject({
				phase: 'verifying',
				status: 'active',
				postSubmitRemediationSubmitsUsed: previous?.state.postSubmitRemediationSubmitsUsed,
			});
			expect(afterRun?.state.lastRemediation).toBeUndefined();
			expect(afterRun?.attempts).toEqual(previous?.attempts);
			expect(afterRun?.lastBuildOutcome?.verification).toMatchObject({
				attempted: true,
				success: false,
			});

			const report = await executeTool(createReportVerificationVerdictTool(context), {
				workItemId: 'wi_1',
				workflowId: 'wf-1',
				executionId: 'exec-1',
				verdict: 'needs_patch',
				workflowInspection: 'Read the saved workflow.',
				failedNodeName: 'Transform',
				diagnosis: 'Invalid expression',
				summary: 'Fix the expression.',
			});
			expect(report.guidance).toContain('src/workflows/main.workflow.ts');
			expect(report.guidance).not.toContain('BUILD BLOCKED');
			expect((await coordinator.getWorkflowLoopState('wi_1'))?.phase).toBe('repairing');
		},
	);

	it.each([
		['an earlier attempt', { verifyAttempts: 1 }],
		[
			'a structured failed attempt',
			{ verification: { attempted: true, success: false, status: 'error' } },
		],
		['a trigger-only outcome', { triggerType: 'trigger_only' }],
		['a one-off outcome', { executionIntent: 'one-off' }],
		['a missing plan', { nodeSimulationPlan: undefined }],
	] satisfies Array<[string, Partial<WorkflowBuildOutcome>]>)(
		'does not resume %s',
		async (_name, overrides) => {
			const { storage } = createStorage();
			const coordinator = new WorkflowTaskCoordinator('thread-1', storage);
			await coordinator.reportBuildOutcome(setupBlockedOutcome(overrides));
			const before = await storage.getWorkItem('thread-1', 'wi_1');
			await expect(coordinator.resumeSetupBlockedVerification('wi_1', 'run-1')).resolves.toBe(
				false,
			);
			expect(await storage.getWorkItem('thread-1', 'wi_1')).toEqual(before);
		},
	);

	it.each(['run', 'budget', 'remediation'])(
		'preserves the %s guard when resuming verification',
		async (guard) => {
			const { storage } = createStorage();
			const coordinator = new WorkflowTaskCoordinator('thread-1', storage);
			await coordinator.reportBuildOutcome(setupBlockedOutcome());
			const item = (await storage.getWorkItem('thread-1', 'wi_1'))!;
			if (guard === 'budget')
				item.state.postSubmitRemediationSubmitsUsed = MAX_POST_SUBMIT_REMEDIATION_SUBMITS;
			if (guard === 'remediation')
				item.state.lastRemediation = { category: 'blocked', shouldEdit: false, guidance: 'Stop.' };
			await storage.saveWorkItem('thread-1', item.state, item.attempts, item.lastBuildOutcome);
			await expect(
				coordinator.resumeSetupBlockedVerification('wi_1', guard === 'run' ? 'run-old' : 'run-1'),
			).resolves.toBe(false);
			expect(await storage.getWorkItem('thread-1', 'wi_1')).toEqual(item);
		},
	);

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
