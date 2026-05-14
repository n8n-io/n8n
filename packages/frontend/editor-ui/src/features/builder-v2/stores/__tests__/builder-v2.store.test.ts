import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBuilderV2Store } from '../builder-v2.store';
import { getSessionState, startSession } from '../../builder-v2.api';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: 'http://localhost:5678', sessionId: '' },
	})),
}));

vi.mock('../../builder-v2.api', () => ({
	startSession: vi.fn(),
	getSessionState: vi.fn(),
	confirmSession: vi.fn(),
}));

const mockStartSession = vi.mocked(startSession);
const mockGetSessionState = vi.mocked(getSessionState);

function builderState(sessionId: string, assistantMessage: string) {
	return {
		sessionId,
		taskList: [],
		ghosts: null,
		insertionPoint: null,
		connectionContext: null,
		narrative: [{ role: 'assistant' as const, content: assistantMessage }],
		workflow: { nodes: [], connections: {} },
		done: true,
		hasPendingSuspension: false,
	};
}

describe('builder-v2.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('keeps earlier chat turns when starting another builder run', async () => {
		const store = useBuilderV2Store();
		const workflowsStore = useWorkflowsStore();
		workflowsStore.workflowId = 'workflow-1';

		mockStartSession.mockResolvedValueOnce({ sessionId: 'session-1' });
		mockGetSessionState.mockResolvedValueOnce(builderState('session-1', 'Added a trigger.'));

		await store.startNewSession('project-1', 'Build a weekly digest', {
			nodes: [],
			connections: {},
		});

		expect(store.chatMessages).toEqual([
			{ role: 'user', content: 'Build a weekly digest' },
			{ role: 'assistant', content: 'Added a trigger.' },
		]);
		expect(store.activeWorkflowId).toBe('workflow-1');
		expect(store.done).toBe(true);

		mockStartSession.mockResolvedValueOnce({ sessionId: 'session-2' });
		mockGetSessionState.mockResolvedValueOnce(builderState('session-2', 'Added the next node.'));

		await store.startNewSession('project-1', 'Add a Gmail step', {
			nodes: [],
			connections: {},
		});

		expect(store.chatMessages).toEqual([
			{ role: 'user', content: 'Build a weekly digest' },
			{ role: 'assistant', content: 'Added a trigger.' },
			{ role: 'user', content: 'Add a Gmail step' },
			{ role: 'assistant', content: 'Added the next node.' },
		]);
		expect(store.userPrompts).toEqual(['Build a weekly digest', 'Add a Gmail step']);
	});

	it('keeps an unsaved workflow builder session attached when the workflow is first saved', async () => {
		const store = useBuilderV2Store();
		const workflowsStore = useWorkflowsStore();
		workflowsStore.workflowId = '';

		mockStartSession.mockResolvedValueOnce({ sessionId: 'session-1' });
		mockGetSessionState.mockResolvedValueOnce(builderState('session-1', 'Added a trigger.'));

		await store.startNewSession('project-1', 'Build a weekly digest', {
			nodes: [],
			connections: {},
		});

		expect(store.activeWorkflowId).toBe('');

		workflowsStore.workflowId = 'workflow-1';

		expect(store.activeWorkflowId).toBe('workflow-1');
		expect(store.chatMessages).toEqual([
			{ role: 'user', content: 'Build a weekly digest' },
			{ role: 'assistant', content: 'Added a trigger.' },
		]);
	});

	it('clears the workflow ownership and transcript on reset', async () => {
		const store = useBuilderV2Store();
		const workflowsStore = useWorkflowsStore();
		workflowsStore.workflowId = 'workflow-1';

		mockStartSession.mockResolvedValueOnce({ sessionId: 'session-1' });
		mockGetSessionState.mockResolvedValueOnce(builderState('session-1', 'Added a trigger.'));

		await store.startNewSession('project-1', 'Build a weekly digest', {
			nodes: [],
			connections: {},
		});

		store.reset();

		expect(store.activeWorkflowId).toBeNull();
		expect(store.chatMessages).toEqual([]);
		expect(store.workflow).toBeNull();
	});
});
