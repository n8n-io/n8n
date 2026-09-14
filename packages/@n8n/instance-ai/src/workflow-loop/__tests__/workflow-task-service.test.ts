import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../__tests__/tool-test-utils';
import { successfulVerification } from '../../__tests__/verification-fixtures';
import type { WorkflowLoopStorage } from '../../storage/workflow-loop-storage';
import { createReportVerificationVerdictTool } from '../../tools/orchestration/report-verification-verdict.tool';
import { createVerifyBuiltWorkflowTool } from '../../tools/orchestration/verify-built-workflow.tool';
import type { OrchestrationContext, InstanceAiContext } from '../../types';
import { MAX_POST_SUBMIT_REMEDIATION_SUBMITS, MAX_VERIFY_ATTEMPTS } from '../remediation';
import { deriveWorkflowVerificationObligation } from '../verification-obligation';
import type { WorkflowBuildOutcome } from '../workflow-loop-state';
import { WorkflowTaskCoordinator } from '../workflow-task-service';

function createStorage() {
	const records = new Map<string, Record<string, unknown>>();

	const storage = {
		updateBuildOutcome: vi.fn(
			async (
				_threadId: string,
				workItemId: string,
				update: (outcome: WorkflowBuildOutcome) => WorkflowBuildOutcome,
			) => {
				const record = records.get(workItemId);
				if (!record?.lastBuildOutcome) throw new Error('Missing outcome');
				records.set(workItemId, {
					...record,
					lastBuildOutcome: update(record.lastBuildOutcome as WorkflowBuildOutcome),
				});
				await Promise.resolve();
			},
		),
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
		updateWorkItem: vi.fn<WorkflowLoopStorage['updateWorkItem']>(
			async (_threadId, workItemId, update) => {
				const item = records.get(workItemId) as Awaited<
					ReturnType<WorkflowLoopStorage['getWorkItem']>
				>;
				const next = item ? update(item) : null;
				if (next) records.set(workItemId, next);
				return await Promise.resolve(next !== null);
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
	it('counts reservations and stops at the attempt limit', async () => {
		const { storage } = createStorage();
		const coordinator = new WorkflowTaskCoordinator('thread-1', storage);
		await coordinator.reportBuildOutcome(createBuildOutcome());
		for (let attempt = 0; attempt < MAX_VERIFY_ATTEMPTS; attempt++) {
			await coordinator.startVerification('wi_1');
		}
		await expect(coordinator.startVerification('wi_1')).rejects.toThrow('attempt limit');
		expect((await coordinator.getBuildOutcome('wi_1'))?.verifyAttempts).toBe(MAX_VERIFY_ATTEMPTS);
	});

	it('merges completed trigger runs against the latest stored coverage', async () => {
		const { storage } = createStorage();
		const coordinator = new WorkflowTaskCoordinator('thread-1', storage);
		await coordinator.reportBuildOutcome(createBuildOutcome({ verificationProgress: {} }));
		await coordinator.startVerification('wi_1', 'A');
		await coordinator.startVerification('wi_1', 'B');
		for (const triggerNodeName of ['B', 'A']) {
			await coordinator.recordVerification('wi_1', successfulVerification(triggerNodeName));
		}
		expect((await coordinator.getBuildOutcome('wi_1'))?.verificationProgress).toMatchObject({
			A: [{ evidence: { nodesExecuted: ['A'] } }],
			B: [{ evidence: { nodesExecuted: ['B'] } }],
		});
	});

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

	function verificationContext(coordinator: WorkflowTaskCoordinator) {
		const run = vi.fn().mockResolvedValue({ executionId: 'exec-1', status: 'success' });
		return {
			run,
			context: mock<OrchestrationContext>({
				runId: 'run-1',
				setupPanelEnabled: true,
				workflowTaskService: coordinator,
				logger: mock<OrchestrationContext['logger']>(),
				domainContext: mock<InstanceAiContext>({
					executionService: mock<InstanceAiContext['executionService']>({
						run,
						getResolvedNodeParameters: vi
							.fn()
							.mockRejectedValue(new Error('No saved parameter data')),
					}),
					workflowService: mock<InstanceAiContext['workflowService']>({
						getAsWorkflowJSON: vi.fn().mockResolvedValue({ nodes: [], connections: {} }),
					}),
				}),
			}),
		};
	}

	async function failedSetupVerification() {
		const { storage } = createStorage();
		const coordinator = new WorkflowTaskCoordinator('thread-1', storage);
		await coordinator.reportBuildOutcome(
			setupBlockedOutcome({
				mockedCredentialTypes: ['gmailOAuth2'],
				mockedNodeNames: ['Send email'],
				nodeSimulationPlan: [
					{
						nodeName: 'Read inbox',
						verdict: 'simulate',
						reason: 'Use example messages.',
						confidence: 'high',
						source: 'deterministic',
					},
				],
				simulationFixtures: { 'Read inbox': [{ subject: 'Example' }] },
			}),
		);
		const { context, run } = verificationContext(coordinator);
		run.mockResolvedValue({
			executionId: 'exec-1',
			status: 'success',
			executedNodeNames: ['Read inbox', 'Send email'],
		});
		run.mockResolvedValueOnce({
			executionId: 'setup-failure',
			status: 'error',
			error: 'Gmail credentials are mocked',
			executedNodeNames: ['Read inbox', 'Send email'],
			nodeErrors: [{ nodeName: 'Send email', message: 'Gmail credentials are mocked' }],
		});
		const result = await executeTool(createVerifyBuiltWorkflowTool(context), {
			workItemId: 'wi_1',
			workflowId: 'wf-1',
		});
		expect(result.remediation).toMatchObject({ category: 'needs_setup', shouldEdit: false });
		const failed = (await storage.getWorkItem('thread-1', 'wi_1'))!;
		expect(failed.state).toMatchObject({
			status: 'blocked',
			lastRemediation: { category: 'needs_setup' },
		});
		expect(failed.lastBuildOutcome).toMatchObject({
			verifyAttempts: 1,
			verification: { attempted: true, success: false },
		});
		return { storage, coordinator, context, run, failed };
	}

	it.each([false, true])(
		'retries a prior setup failure on a later turn with editable failure=%s',
		async (editableFailure) => {
			const { storage, coordinator, context, run, failed } = await failedSetupVerification();
			expect(
				deriveWorkflowVerificationObligation('thread-1', failed, { setupPanelEnabled: true })
					.status,
			).toBe('needs_setup');
			context.runId = 'run-next';
			const readWorkflow = vi.mocked(context.domainContext!.workflowService.getAsWorkflowJSON);
			readWorkflow.mockClear();
			if (editableFailure)
				run.mockResolvedValueOnce({
					executionId: 'retry-failure',
					status: 'error',
					error: 'Invalid expression',
					nodeErrors: [{ nodeName: 'Transform', message: 'Invalid expression' }],
				});
			const result = await executeTool(createVerifyBuiltWorkflowTool(context), {
				workItemId: 'wi_1',
				workflowId: 'wf-1',
			});
			expect(run).toHaveBeenCalledTimes(2);
			expect(readWorkflow).toHaveBeenCalledOnce();
			expect(result.success).toBe(!editableFailure);
			const retried = (await storage.getWorkItem('thread-1', 'wi_1'))!;
			expect(retried.state).toEqual({
				...failed.state,
				runId: 'run-next',
				phase: 'verifying',
				status: 'active',
				lastRemediation: undefined,
			});
			expect(retried.attempts).toEqual(failed.attempts);
			expect(retried.lastBuildOutcome?.verifyAttempts).toBe(2);
			const report = await executeTool(createReportVerificationVerdictTool(context), {
				workItemId: 'wi_1',
				workflowId: 'wf-1',
				executionId: editableFailure ? 'retry-failure' : 'exec-1',
				verdict: editableFailure ? 'needs_patch' : 'verified',
				workflowInspection: 'Read the saved workflow.',
				...(editableFailure
					? { failedNodeName: 'Transform', diagnosis: 'Invalid expression' }
					: {}),
				summary: editableFailure ? 'Fix the expression.' : 'The workflow ran successfully.',
			});
			expect(report.guidance).not.toContain('STALE REPORT');
			expect((await coordinator.getWorkflowLoopState('wi_1'))?.phase).toBe(
				editableFailure ? 'repairing' : 'done',
			);
		},
	);

	it.each([
		'same run',
		'terminal blocker',
		'repair budget',
		'verification budget',
		'changed snapshot',
	])('preserves the %s guard after a setup failure', async (guard) => {
		const { storage, coordinator, context, run, failed } = await failedSetupVerification();
		const snapshot = structuredClone(failed);
		context.runId = guard === 'same run' ? 'run-1' : 'run-next';
		if (guard === 'terminal blocker')
			failed.state.lastRemediation = { category: 'blocked', shouldEdit: false, guidance: 'Stop.' };
		if (guard === 'repair budget')
			failed.state.postSubmitRemediationSubmitsUsed = MAX_POST_SUBMIT_REMEDIATION_SUBMITS;
		if (guard === 'verification budget')
			failed.lastBuildOutcome!.verifyAttempts = MAX_VERIFY_ATTEMPTS;
		if (guard === 'changed snapshot') failed.state.runId = 'run-other';
		await storage.saveWorkItem('thread-1', failed.state, failed.attempts, failed.lastBuildOutcome);
		if (guard !== 'changed snapshot') {
			const result = await executeTool(createVerifyBuiltWorkflowTool(context), {
				workItemId: 'wi_1',
				workflowId: 'wf-1',
			});
			expect(result.success).toBe(false);
			expect(run).toHaveBeenCalledOnce();
		}
		const expected = guard === 'changed snapshot' ? snapshot : failed;
		await expect(
			coordinator.beginVerification(expected.lastBuildOutcome!, expected.state, context.runId),
		).resolves.toBe(false);
		expect(await storage.getWorkItem('thread-1', 'wi_1')).toEqual(failed);
	});

	it('keeps legacy retry handling when the panel is disabled', async () => {
		const { coordinator, context, run } = await failedSetupVerification();
		context.setupPanelEnabled = false;
		context.runId = 'run-next';
		const begin = vi.spyOn(coordinator, 'beginVerification');
		const result = await executeTool(createVerifyBuiltWorkflowTool(context), {
			workItemId: 'wi_1',
			workflowId: 'wf-1',
		});
		expect(result.success).toBe(true);
		expect(run).toHaveBeenCalledTimes(2);
		expect(begin).not.toHaveBeenCalled();
	});

	it.each(['before the claim', 'after the claim'])(
		'reports a changed state when the second request reads state %s',
		async (timing) => {
			const { storage } = createStorage();
			const coordinator = new WorkflowTaskCoordinator('thread-1', storage);
			await coordinator.reportBuildOutcome(setupBlockedOutcome());
			const { context, run } = verificationContext(coordinator);
			const readState = coordinator.getWorkflowLoopState.bind(coordinator);
			const begin = coordinator.beginVerification.bind(coordinator);
			let releaseReads!: () => void;
			const readsReady = new Promise<void>((resolve) => {
				releaseReads = resolve;
			});
			let releaseClaim!: () => void;
			const claimDone = new Promise<void>((resolve) => {
				releaseClaim = resolve;
			});
			let reads = 0;
			vi.spyOn(coordinator, 'beginVerification').mockImplementation(async (...args) => {
				const result = await begin(...args);
				releaseClaim();
				return result;
			});
			vi.spyOn(coordinator, 'getWorkflowLoopState').mockImplementation(async (id) => {
				const index = ++reads;
				if (index === 2 && timing === 'after the claim') await claimDone;
				const state = await readState(id);
				if (index <= 2 && timing === 'before the claim') {
					if (index === 2) releaseReads();
					await readsReady;
				}
				return state;
			});
			const tool = createVerifyBuiltWorkflowTool(context);
			const input = { workItemId: 'wi_1', workflowId: 'wf-1' };
			const results = await Promise.all([executeTool(tool, input), executeTool(tool, input)]);
			expect(run).toHaveBeenCalledOnce();
			expect(results.filter((result) => result.success)).toHaveLength(1);
			expect(results.find((result) => !result.success)?.remediation).toMatchObject({
				category: 'blocked',
				reason: 'verification_state_changed',
			});
		},
	);

	it('does not execute when saving verification ownership fails', async () => {
		const { storage } = createStorage();
		const coordinator = new WorkflowTaskCoordinator('thread-1', storage);
		await coordinator.reportBuildOutcome(setupBlockedOutcome());
		const before = await storage.getWorkItem('thread-1', 'wi_1');
		const { context, run } = verificationContext(coordinator);
		vi.mocked(storage.updateWorkItem).mockRejectedValueOnce(new Error('Save failed'));
		await expect(
			executeTool(createVerifyBuiltWorkflowTool(context), {
				workItemId: 'wi_1',
				workflowId: 'wf-1',
			}),
		).rejects.toThrow('Save failed');
		expect(run).not.toHaveBeenCalled();
		expect(await storage.getWorkItem('thread-1', 'wi_1')).toEqual(before);
	});

	it.each(['run-1', 'run-next'])(
		'can verify a saved final repair in %s without resetting its budget',
		async (runId) => {
			const { storage } = createStorage();
			const coordinator = new WorkflowTaskCoordinator('thread-1', storage);
			const outcome = setupBlockedOutcome({
				needsUserInput: false,
				remediation: undefined,
				verificationReadiness: { status: 'ready' },
			});
			await coordinator.reportBuildOutcome(outcome);
			for (let attempt = 0; attempt < MAX_POST_SUBMIT_REMEDIATION_SUBMITS; attempt++) {
				await coordinator.reportBuildOutcome({ ...outcome, taskId: `repair-${attempt}` });
			}
			const { context, run } = verificationContext(coordinator);
			context.runId = runId;
			await executeTool(createVerifyBuiltWorkflowTool(context), {
				workItemId: 'wi_1',
				workflowId: 'wf-1',
			});
			expect(run).toHaveBeenCalledOnce();
			expect(
				(await coordinator.getWorkflowLoopState('wi_1'))?.postSubmitRemediationSubmitsUsed,
			).toBe(MAX_POST_SUBMIT_REMEDIATION_SUBMITS);
		},
	);

	it.each([
		{ setupPanelEnabled: true, runId: 'run-1', previouslyVerified: false },
		{ setupPanelEnabled: false, runId: 'run-1', previouslyVerified: false },
		{ setupPanelEnabled: true, runId: 'run-next', previouslyVerified: false },
		{ setupPanelEnabled: true, runId: 'run-next', previouslyVerified: true },
	])(
		'preserves repair with panel=$setupPanelEnabled, run=$runId, prior verification=$previouslyVerified',
		async ({ setupPanelEnabled, runId, previouslyVerified }) => {
			const { storage } = createStorage();
			const coordinator = new WorkflowTaskCoordinator('thread-1', storage);
			await coordinator.reportBuildOutcome(
				setupBlockedOutcome(
					previouslyVerified
						? {
								needsUserInput: false,
								remediation: undefined,
								verificationReadiness: { status: 'ready' },
								verifyAttempts: 1,
								verification: { attempted: true, success: true, executionId: 'previous-exec' },
							}
						: {},
				),
			);
			if (previouslyVerified)
				await coordinator.reportVerificationVerdict({
					workItemId: 'wi_1',
					workflowId: 'wf-1',
					runId: 'run-1',
					verdict: 'verified',
					summary: 'Verified.',
				});
			const previous = await storage.getWorkItem('thread-1', 'wi_1');
			const run = vi.fn().mockResolvedValue({
				executionId: 'exec-1',
				status: 'error',
				error: 'Invalid expression',
				nodeErrors: [{ nodeName: 'Transform', message: 'Invalid expression' }],
			});
			const context = mock<OrchestrationContext>({
				runId,
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
				runId,
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
			await expect(
				coordinator.reportVerificationVerdict({
					workItemId: 'wi_1',
					workflowId: 'wf-1',
					runId: 'run-old',
					verdict: 'verified',
					summary: 'Late result.',
				}),
			).resolves.toMatchObject({ type: 'ignored' });
			await expect(
				coordinator.reportBuildOutcome(
					setupBlockedOutcome({
						runId,
						taskId: 'repair-1',
						needsUserInput: false,
						remediation: undefined,
						verificationReadiness: { status: 'ready' },
					}),
				),
			).resolves.toMatchObject({ type: 'verify' });
			expect(
				(await coordinator.getWorkflowLoopState('wi_1'))?.postSubmitRemediationSubmitsUsed,
			).toBe(1);
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
			await expect(
				coordinator.beginVerification(before!.lastBuildOutcome!, before!.state, 'run-1'),
			).resolves.toBe(false);
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
				coordinator.beginVerification(
					item.lastBuildOutcome!,
					{ ...item.state, ...(guard === 'run' ? { runId: 'run-old' } : {}) },
					'run-next',
				),
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
