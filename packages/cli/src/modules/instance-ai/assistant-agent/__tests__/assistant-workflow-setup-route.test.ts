import type { Logger } from '@n8n/backend-common';
import { WorkflowLoopStorage, type WorkflowBuildOutcome } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type { AssistantTurnMemory } from '../../turn-setup/assistant-turn-runtime';
import {
	AssistantWorkflowSetupRoute,
	WORKFLOW_SETUP_INSTRUCTION_REASON,
	workflowIdOfSetupSuspension,
} from '../assistant-workflow-setup-route';

const THREAD_ID = 'thread-1';

interface ThreadRecord {
	id: string;
	title: string;
	resourceId: string;
	createdAt: Date;
	updatedAt: Date;
	metadata: Record<string, unknown>;
}

/** A thread store with `patchThread`, so the real workflow loop storage runs against it. */
function createMemory(options: { rejectRoutedMarker?: boolean } = {}) {
	let thread: ThreadRecord = {
		id: THREAD_ID,
		title: 'Thread',
		resourceId: 'user-1',
		createdAt: new Date(),
		updatedAt: new Date(),
		metadata: {},
	};
	const memory = {
		getThread: async () => structuredClone(thread),
		patchThread: async ({
			update,
		}: {
			threadId: string;
			update: (current: ThreadRecord) => Partial<ThreadRecord> | null | undefined;
		}) => {
			const patch = update(structuredClone(thread));
			if (!patch) return thread;
			if (options.rejectRoutedMarker && JSON.stringify(patch).includes('setupRoutedAt')) {
				throw new Error('storage down');
			}
			thread = { ...thread, ...patch };
			return thread;
		},
	};
	return memory as unknown as AssistantTurnMemory;
}

function outcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
	return {
		workItemId: 'wi-1',
		runId: 'run-1',
		taskId: 'task-1',
		workflowId: 'wf-1',
		submitted: true,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		summary: 'Built.',
		verificationReadiness: {
			status: 'needs_setup',
			reason: 'workflow-needs-setup',
			guidance: 'Connect Slack first.',
		},
		setupRequirement: {
			status: 'required',
			reason: 'mocked-credentials',
			guidance: 'Connect Slack.',
		},
		...overrides,
	};
}

async function saveBuild(memory: AssistantTurnMemory, build: WorkflowBuildOutcome) {
	await new WorkflowLoopStorage(memory).saveWorkItem(
		THREAD_ID,
		{
			workItemId: build.workItemId,
			threadId: THREAD_ID,
			status: 'active',
			phase: 'verifying',
			source: 'create',
			rebuildAttempts: 0,
		},
		[],
		build,
	);
}

async function routedAt(memory: AssistantTurnMemory, workItemId = 'wi-1') {
	const record = await new WorkflowLoopStorage(memory).getWorkItem(THREAD_ID, workItemId);
	return record?.state.setupRoutedAt;
}

describe('AssistantWorkflowSetupRoute', () => {
	const logger = mock<Logger>();

	it('routes a concluded build that needs setup once, and marks it first', async () => {
		const memory = createMemory();
		await saveBuild(memory, outcome());
		const route = new AssistantWorkflowSetupRoute(memory, THREAD_ID, logger);

		const instruction = await route.nextInstruction();

		expect(instruction?.reason).toBe(WORKFLOW_SETUP_INSTRUCTION_REASON);
		expect(instruction?.content).toContain('<workflow-setup-required>');
		expect(instruction?.content).toContain('"workflowId": "wf-1"');
		expect(instruction?.content).toContain('`setup_workflow`');
		expect(await routedAt(memory)).toEqual(expect.any(String));
		// A later turn reads the marker, so it does not route the same build again.
		expect(
			await new AssistantWorkflowSetupRoute(memory, THREAD_ID, logger).nextInstruction(),
		).toBeUndefined();
	});

	it('sends no instruction when the marker cannot be stored', async () => {
		const memory = createMemory({ rejectRoutedMarker: true });
		await saveBuild(memory, outcome());
		const route = new AssistantWorkflowSetupRoute(memory, THREAD_ID, logger);

		expect(await route.nextInstruction()).toBeUndefined();
	});

	it.each([
		['setup is not required', { setupRequirement: { status: 'not_required' as const } }],
		['verification has not concluded', { verificationReadiness: { status: 'ready' as const } }],
	])('does not route a build when %s', async (_name, overrides) => {
		const memory = createMemory();
		await saveBuild(memory, outcome(overrides));
		const route = new AssistantWorkflowSetupRoute(memory, THREAD_ID, logger);

		expect(await route.nextInstruction()).toBeUndefined();
		expect(await routedAt(memory)).toBeUndefined();
	});

	it('marks a build as routed when its setup card suspended the turn', async () => {
		const memory = createMemory();
		await saveBuild(memory, outcome());
		await saveBuild(memory, outcome({ workItemId: 'wi-2', workflowId: 'wf-2' }));
		const route = new AssistantWorkflowSetupRoute(memory, THREAD_ID, logger);

		route.observeSuspension('setup_workflow', { workflowId: 'wf-1', setupRequests: [] });
		route.observeSuspension('ask_user', { workflowId: 'wf-2' });
		await route.markSuspendedSetupsRouted();

		expect(await routedAt(memory, 'wi-1')).toEqual(expect.any(String));
		expect(await routedAt(memory, 'wi-2')).toBeUndefined();
		// The resumed turn routes only the build whose card never showed.
		const instruction = await new AssistantWorkflowSetupRoute(
			memory,
			THREAD_ID,
			logger,
		).nextInstruction();
		expect(instruction?.content).toContain('"workflowId": "wf-2"');
	});
});

describe('workflowIdOfSetupSuspension', () => {
	it.each([
		['setup_workflow', { workflowId: 'wf-1', setupRequests: [] }, 'wf-1'],
		['call_tool', { workflowId: 'wf-1', setupRequests: [] }, 'wf-1'],
		['setup_workflow', { workflowId: 'wf-1' }, undefined],
		['ask_user', { workflowId: 'wf-1', setupRequests: [] }, undefined],
		['setup_workflow', undefined, undefined],
	])('reads %s with %j as %s', (toolName, payload, expected) => {
		expect(workflowIdOfSetupSuspension(toolName, payload)).toBe(expected);
	});
});
