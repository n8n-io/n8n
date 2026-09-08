import type { PlannedTaskGraph, PlannedTaskRecord, WorkflowBuildOutcome } from '@n8n/instance-ai';
import type { WorkflowLoopWorkItemRecord } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type { TypeORMAgentMemory } from '../storage/typeorm-agent-memory';
import { WorkflowVerificationObligationService } from '../workflow-verification-obligation-service';

// Memory with no stored thread: the service falls back to deriving the
// obligation from the planned task's recorded outcome — the same path the
// planned scheduler takes on a fresh tick.
const emptyMemory = {
	getThread: async () => null,
	saveThread: async () => undefined,
} as unknown as TypeORMAgentMemory;

function makeOutcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
	return {
		workItemId: 'src/workflows/main.workflow.ts',
		taskId: 'task-1',
		workflowId: 'wf-1',
		submitted: true,
		triggerType: 'manual_or_testable',
		triggerNodes: [{ nodeName: 'Start', nodeType: 'n8n-nodes-base.manualTrigger' }],
		needsUserInput: false,
		verificationReadiness: { status: 'ready' },
		setupRequirement: { status: 'not_required' },
		summary: 'Workflow saved.',
		...overrides,
	};
}

function makeGraph(outcome: WorkflowBuildOutcome): PlannedTaskGraph {
	const task: PlannedTaskRecord = {
		id: 'task-1',
		title: 'Build export workflow',
		kind: 'build-workflow',
		spec: 'Build it.',
		deps: [],
		status: 'succeeded',
		outcome: outcome as unknown as Record<string, unknown>,
	};
	return { planRunId: 'run-1', status: 'active', tasks: [task] };
}

describe('WorkflowVerificationObligationService.findPendingPlannedWorkflowVerification', () => {
	const service = new WorkflowVerificationObligationService(emptyMemory);

	it('returns a pending verification for a ready build outcome', async () => {
		const verification = await service.findPendingPlannedWorkflowVerification(
			'thread-1',
			makeGraph(makeOutcome()),
		);

		expect(verification?.obligation.status).toBe('ready_to_verify');
		expect(verification?.task.id).toBe('task-1');
	});

	// The loop-safety pin for one-off builds: a settled obligation means the
	// planned scheduler never emits `orchestrate-workflow-verification`, so a
	// one-off build can never re-arm verification follow-ups (see
	// .agents/specs/instance-ai-one-off-operations.md §2a).
	it('skips one-off build outcomes (executionIntent: one-off)', async () => {
		const verification = await service.findPendingPlannedWorkflowVerification(
			'thread-1',
			makeGraph(makeOutcome({ executionIntent: 'one-off' })),
		);

		expect(verification).toBeUndefined();
	});

	it('skips outcomes with successful verification evidence', async () => {
		const verification = await service.findPendingPlannedWorkflowVerification(
			'thread-1',
			makeGraph(
				makeOutcome({
					verification: {
						attempted: true,
						success: true,
						executionId: 'exec-1',
						status: 'success',
					},
				}),
			),
		);

		expect(verification).toBeUndefined();
	});
});

describe('WorkflowVerificationObligationService setup panel policy', () => {
	afterEach(() => vi.restoreAllMocks());

	it.each([true, false])(
		'applies the panel flag to direct and planned reads: %s',
		async (enabled) => {
			const getThread = vi.fn<TypeORMAgentMemory['getThread']>();
			const memory = mock<TypeORMAgentMemory>({ getThread });
			const service = new WorkflowVerificationObligationService(memory, () => enabled);
			const outcome = makeOutcome({
				needsUserInput: true,
				nodeSimulationPlan: [],
				verificationReadiness: {
					status: 'needs_setup',
					reason: 'workflow-needs-setup',
					guidance: 'Connect the account.',
				},
				remediation: {
					category: 'needs_setup',
					shouldEdit: false,
					guidance: 'Connect the account.',
				},
			});
			const record: WorkflowLoopWorkItemRecord = {
				state: {
					workItemId: outcome.workItemId,
					threadId: 'thread-1',
					phase: 'blocked',
					status: 'blocked',
					source: 'create',
					rebuildAttempts: 0,
					lastRemediation: outcome.remediation,
				},
				attempts: [],
				lastBuildOutcome: outcome,
			};
			const thread = {
				id: 'thread-1',
				resourceId: 'user-1',
				title: 'Setup',
				createdAt: new Date(),
				updatedAt: new Date(),
				metadata: { instanceAiWorkflowLoop: { [outcome.workItemId]: record } },
			};
			getThread.mockResolvedValue(thread);
			expect(
				(await service.getObligation('thread-1', outcome.workItemId, { source: 'direct' }))?.status,
			).toBe(enabled ? 'ready_to_verify' : 'needs_setup');
			for (const stored of [thread, null]) {
				getThread.mockResolvedValue(stored);
				const pending = await service.findPendingPlannedWorkflowVerification(
					'thread-1',
					makeGraph(outcome),
				);
				if (enabled)
					expect(pending?.obligation).toMatchObject({
						status: 'ready_to_verify',
						source: 'planned',
						plannedTaskId: 'task-1',
					});
				else expect(pending).toBeUndefined();
			}
		},
	);

	it.each([
		{ verifyAttempts: 1 },
		{ verification: { attempted: true, success: false, status: 'error' } },
		{ executionIntent: 'one-off' },
	] satisfies Array<Partial<WorkflowBuildOutcome>>)(
		'keeps attempted and one-off outcomes settled: %j',
		async (overrides) => {
			const service = new WorkflowVerificationObligationService(emptyMemory, () => true);
			const outcome = makeOutcome({
				needsUserInput: true,
				nodeSimulationPlan: [],
				verificationReadiness: {
					status: 'needs_setup',
					reason: 'workflow-needs-setup',
					guidance: 'Connect the account.',
				},
				...overrides,
			});
			await expect(
				service.findPendingPlannedWorkflowVerification('thread-1', makeGraph(outcome)),
			).resolves.toBeUndefined();
		},
	);
});
