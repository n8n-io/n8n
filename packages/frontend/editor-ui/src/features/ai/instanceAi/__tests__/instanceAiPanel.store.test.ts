import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

const mocks = vi.hoisted(() => ({
	routerPush: vi.fn(),
	syncThread: vi.fn(),
	getOrCreateRuntime: vi.fn(),
	sendMessage: vi.fn(),
	showError: vi.fn(),
	ensurePersonalProjectId: vi.fn(),
	resolveQuickHelpThreadId: vi.fn(),
}));

let instanceAiAvailable = true;

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({
		push: mocks.routerPush,
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {}, pushRef: 'push-ref' }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError }),
}));

vi.mock('../composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => computed(() => instanceAiAvailable),
}));

vi.mock('../composables/useInstanceAiHandoff', () => ({
	ensurePersonalProjectId: mocks.ensurePersonalProjectId,
}));

vi.mock('../resolveQuickHelpThread', () => ({
	resolveQuickHelpThreadId: mocks.resolveQuickHelpThreadId,
}));

vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: () => ({
		syncThread: mocks.syncThread,
		getOrCreateRuntime: mocks.getOrCreateRuntime,
	}),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		workflowId: 'workflow-1',
	}),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	createWorkflowDocumentId: (id: string) => id,
	useWorkflowDocumentStore: () => ({
		allNodes: [
			{ id: 'node-1', name: 'Post to Slack', type: 'n8n-nodes-base.slack' },
			{ id: 'node-2', name: 'Send Email', type: 'n8n-nodes-base.gmail' },
		],
	}),
}));

import { useInstanceAiPanelStore } from '../instanceAiPanel.store';
import type { ProactiveOffer } from '../instanceAiPanel.types';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';

const offer: ProactiveOffer = {
	key: 'execution:4711',
	title: 'I can help with that',
	detail: 'HTTP Request failed',
	message: 'Help me fix this execution.\n\n<context>…</context>',
	projectId: 'project-1',
	source: 'proactive_offer',
};

describe('useInstanceAiPanelStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		instanceAiAvailable = true;
		mocks.syncThread.mockResolvedValue(undefined);
		mocks.ensurePersonalProjectId.mockResolvedValue('personal-1');
		mocks.resolveQuickHelpThreadId.mockResolvedValue('thread-1');
		mocks.getOrCreateRuntime.mockReturnValue({ sendMessage: mocks.sendMessage });
		mocks.routerPush.mockResolvedValue(undefined);
	});

	it('opens and closes the panel', () => {
		const store = useInstanceAiPanelStore();

		store.open();
		expect(store.isOpen).toBe(true);

		store.close();
		expect(store.isOpen).toBe(false);
	});

	it('is inert when Instance AI is unavailable', async () => {
		instanceAiAvailable = false;
		const store = useInstanceAiPanelStore();

		store.open();
		expect(store.isOpen).toBe(false);

		await expect(store.openWithSeed(offer)).resolves.toBe(false);
		expect(mocks.syncThread).not.toHaveBeenCalled();
		expect(store.isOpen).toBe(false);
	});

	it('openWithSeed syncs the quick-help thread, opens the panel, and prefills without sending', async () => {
		const store = useInstanceAiPanelStore();

		await expect(store.openWithSeed(offer)).resolves.toBe(true);

		expect(mocks.resolveQuickHelpThreadId).toHaveBeenCalledWith('project-1');
		expect(mocks.syncThread).toHaveBeenCalledWith('thread-1', 'project-1', {
			source: 'proactive_offer',
			origin: 'internal',
			sourceContext: { offerKey: 'execution:4711' },
		});
		expect(mocks.getOrCreateRuntime).toHaveBeenCalledWith('thread-1', 'project-1');
		expect(mocks.sendMessage).not.toHaveBeenCalled();
		expect(store.isOpen).toBe(true);
		expect(store.activeThreadId).toBe('thread-1');
		expect(store.pendingOffer).toEqual(offer);
		expect(mocks.routerPush).not.toHaveBeenCalled();
	});

	it('falls back to the personal project when the offer has no projectId', async () => {
		const store = useInstanceAiPanelStore();
		const { projectId: _projectId, ...offerWithoutProject } = offer;

		await expect(store.openWithSeed(offerWithoutProject)).resolves.toBe(true);

		expect(mocks.ensurePersonalProjectId).toHaveBeenCalled();
		expect(mocks.resolveQuickHelpThreadId).toHaveBeenCalledWith('personal-1');
		expect(mocks.syncThread).toHaveBeenCalledWith(
			'thread-1',
			'personal-1',
			expect.objectContaining({ source: 'proactive_offer' }),
		);
	});

	it('shows an error and stays closed when syncThread fails', async () => {
		mocks.syncThread.mockRejectedValueOnce(new Error('network'));
		const store = useInstanceAiPanelStore();

		await expect(store.openWithSeed(offer)).resolves.toBe(false);

		expect(mocks.showError).toHaveBeenCalled();
		expect(store.isOpen).toBe(false);
		expect(store.activeThreadId).toBeNull();
		expect(mocks.sendMessage).not.toHaveBeenCalled();
	});

	it('expandToFullView navigates to the thread then closes the panel', async () => {
		const store = useInstanceAiPanelStore();
		await store.openWithSeed(offer);

		await store.expandToFullView();

		expect(mocks.routerPush).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-1' },
		});
		expect(store.isOpen).toBe(false);
		expect(store.pendingOffer).toBeNull();
	});

	it('expandToFullView is a no-op without an active thread', async () => {
		const store = useInstanceAiPanelStore();

		await store.expandToFullView();

		expect(mocks.routerPush).not.toHaveBeenCalled();
	});

	it('toggles node picker only while the panel is open', () => {
		const store = useInstanceAiPanelStore();

		store.toggleNodePicker();
		expect(store.isNodePickerActive).toBe(false);

		store.open();
		store.toggleNodePicker();
		expect(store.isNodePickerActive).toBe(true);

		store.close();
		expect(store.isNodePickerActive).toBe(false);
	});

	it('adds selected canvas nodes as context while the picker is active', () => {
		const store = useInstanceAiPanelStore();
		store.open();
		store.toggleNodePicker();

		store.addContextNodesFromSelection(['node-1', 'node-2', 'missing']);

		expect(store.contextNodes).toEqual([
			{ nodeId: 'node-1', nodeName: 'Post to Slack', nodeType: 'n8n-nodes-base.slack' },
			{ nodeId: 'node-2', nodeName: 'Send Email', nodeType: 'n8n-nodes-base.gmail' },
		]);

		store.removeContextNode('node-1');
		expect(store.contextNodes).toEqual([
			{ nodeId: 'node-2', nodeName: 'Send Email', nodeType: 'n8n-nodes-base.gmail' },
		]);
	});

	it('ignores canvas selection when the picker is inactive', () => {
		const store = useInstanceAiPanelStore();
		store.open();

		store.addContextNodesFromSelection(['node-1']);

		expect(store.contextNodes).toEqual([]);
	});
});
