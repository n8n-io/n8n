import { WorkflowLoopStorage, type WorkflowBuildOutcome } from '@n8n/instance-ai';

import type { AssistantTurnMemory } from '../../turn-setup/assistant-turn-runtime';

export const THREAD_ID = 'thread-1';

interface ThreadRecord {
	id: string;
	title: string;
	resourceId: string;
	createdAt: Date;
	updatedAt: Date;
	metadata: Record<string, unknown>;
}

/** A thread store with `patchThread`, so the real workflow loop storage runs against it. */
export function createMemory(options: { rejectRoutedMarker?: boolean } = {}) {
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

export function outcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
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

export async function saveBuild(memory: AssistantTurnMemory, build: WorkflowBuildOutcome) {
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

export async function routedAt(memory: AssistantTurnMemory, workItemId = 'wi-1') {
	const record = await new WorkflowLoopStorage(memory).getWorkItem(THREAD_ID, workItemId);
	return record?.state.setupRoutedAt;
}
