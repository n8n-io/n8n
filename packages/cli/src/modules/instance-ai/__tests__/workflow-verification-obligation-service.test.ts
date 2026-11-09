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

function makeRecord(outcome: WorkflowBuildOutcome): WorkflowLoopWorkItemRecord {
	return {
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
}

const needsSetupOutcome = (overrides: Partial<WorkflowBuildOutcome> = {}) =>
	makeOutcome({
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

describe('WorkflowVerificationObligationService setup panel policy', () => {
	afterEach(() => vi.restoreAllMocks());

	it.each([true, false])('applies the panel flag to stored reads: %s', async (enabled) => {
		const getThread = vi.fn<TypeORMAgentMemory['getThread']>();
		const memory = mock<TypeORMAgentMemory>({ getThread });
		const service = new WorkflowVerificationObligationService(
			memory,
			(threadId) => threadId === 'thread-1' && enabled,
		);
		const outcome = needsSetupOutcome();
		getThread.mockResolvedValue({
			id: 'thread-1',
			resourceId: 'user-1',
			title: 'Setup',
			createdAt: new Date(),
			updatedAt: new Date(),
			metadata: { instanceAiWorkflowLoop: { [outcome.workItemId]: makeRecord(outcome) } },
		});

		expect((await service.getObligation('thread-1', outcome.workItemId))?.status).toBe(
			enabled ? 'ready_to_verify' : 'needs_setup',
		);
	});

	it('returns undefined when the work item is not stored', async () => {
		const getThread = vi.fn<TypeORMAgentMemory['getThread']>().mockResolvedValue(null);
		const service = new WorkflowVerificationObligationService(
			mock<TypeORMAgentMemory>({ getThread }),
		);

		await expect(service.getObligation('thread-1', 'missing')).resolves.toBeUndefined();
	});
});
