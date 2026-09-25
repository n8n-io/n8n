import type { WorkflowBuildOutcome } from '@n8n/instance-ai';
import type { WorkflowLoopWorkItemRecord } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type { TypeORMAgentMemory } from '../storage/typeorm-agent-memory';
import { WorkflowVerificationObligationService } from '../workflow-verification-obligation-service';

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

function makeNeedsSetupOutcome(
	overrides: Partial<WorkflowBuildOutcome> = {},
): WorkflowBuildOutcome {
	return makeOutcome({
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
		...overrides,
	});
}

function makeRecord(
	outcome: WorkflowBuildOutcome,
	state: Partial<WorkflowLoopWorkItemRecord['state']> = {},
): WorkflowLoopWorkItemRecord {
	return {
		state: {
			workItemId: outcome.workItemId,
			threadId: 'thread-1',
			phase: 'blocked',
			status: 'blocked',
			source: 'create',
			rebuildAttempts: 0,
			lastRemediation: outcome.remediation,
			...state,
		},
		attempts: [],
		lastBuildOutcome: outcome,
	};
}

function makeService(record: WorkflowLoopWorkItemRecord, setupPanelEnabled: boolean) {
	const getThread = vi.fn<TypeORMAgentMemory['getThread']>();
	getThread.mockResolvedValue({
		id: 'thread-1',
		resourceId: 'user-1',
		title: 'Setup',
		createdAt: new Date(),
		updatedAt: new Date(),
		metadata: { instanceAiWorkflowLoop: { [record.state.workItemId]: record } },
	});
	const memory = mock<TypeORMAgentMemory>({ getThread });
	return new WorkflowVerificationObligationService(
		memory,
		(threadId) => threadId === 'thread-1' && setupPanelEnabled,
	);
}

describe('WorkflowVerificationObligationService setup panel policy', () => {
	afterEach(() => vi.restoreAllMocks());

	it.each([true, false])('applies the panel flag to direct reads: %s', async (enabled) => {
		const outcome = makeNeedsSetupOutcome();
		const service = makeService(makeRecord(outcome), enabled);

		expect(
			(await service.getObligation('thread-1', outcome.workItemId, { source: 'direct' }))?.status,
		).toBe(enabled ? 'ready_to_verify' : 'needs_setup');
	});

	it.each([
		{ verifyAttempts: 1 },
		{ verification: { attempted: true, success: false, status: 'error' } },
		{ executionIntent: 'one-off' },
	] satisfies Array<Partial<WorkflowBuildOutcome>>)(
		'keeps attempted and one-off outcomes settled: %j',
		async (overrides) => {
			const outcome = makeNeedsSetupOutcome(overrides);
			const service = makeService(makeRecord(outcome), true);

			const obligation = await service.getObligation('thread-1', outcome.workItemId, {
				source: 'direct',
			});

			expect(obligation?.status).not.toBe('ready_to_verify');
		},
	);
});

describe('WorkflowVerificationObligationService.isPlannedRecord', () => {
	const service = new WorkflowVerificationObligationService(mock<TypeORMAgentMemory>());

	it('flags legacy records owned by a planned task', () => {
		expect(
			service.isPlannedRecord(
				makeRecord(makeOutcome(), { owner: { type: 'planned', taskId: 'task-1' } }),
			),
		).toBe(true);
		expect(service.isPlannedRecord(makeRecord(makeOutcome(), { plannedTaskId: 'task-1' }))).toBe(
			true,
		);
	});

	it('does not flag direct records', () => {
		expect(service.isPlannedRecord(makeRecord(makeOutcome()))).toBe(false);
	});
});
