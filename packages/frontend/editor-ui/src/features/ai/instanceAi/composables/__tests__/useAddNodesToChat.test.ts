import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const stageNodeSets = vi.fn();
const stash = vi.fn();
const openThreadForDraft = vi.fn();
const routerPush = vi.fn();

vi.mock('../../instanceAi.store', () => ({
	useInstanceAiStore: () => ({ stageNodeSets }),
}));
vi.mock('../useInstanceAiHandoff', async (orig) => ({
	...(await orig<object>()),
	stashPendingDraftAttachment: (...a: unknown[]) => stash(...a),
	useInstanceAiHandoff: () => ({ openThreadForDraft }),
}));
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled: vi.fn(() => true) }),
}));
vi.mock('@/app/composables/useEditorContext', () => ({
	useEditorContext: () => ({ instanceAi: { value: true } }),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: vi.fn(), showError: vi.fn() }),
}));
vi.mock('vue-router', () => ({
	useRouter: () => ({ push: routerPush }),
}));

import { useAddNodesToChat } from '../useAddNodesToChat';
import { INSTANCE_AI_THREAD_VIEW } from '../../constants';
import type { NodeContextWorkflow } from '../../utils/buildNodesAttachment';

const wf: NodeContextWorkflow = {
	nodes: [{ id: 'n1', name: 'A', type: 't' }],
	connections: {},
	groupsById: new Map(),
	nodeIdToGroupId: new Map(),
};

describe('useAddNodesToChat', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		stageNodeSets.mockClear();
		stash.mockClear();
		openThreadForDraft.mockClear();
		routerPush.mockClear();
	});

	it('Context A stages directly, does not stash/navigate', async () => {
		const { addSelectedNodesToChat } = useAddNodesToChat();
		await addSelectedNodesToChat({
			workflowId: 'w1',
			selectedNodeIds: ['n1'],
			workflow: wf,
			isInsideThread: true,
		});
		expect(stageNodeSets).toHaveBeenCalledWith('w1', expect.any(Array));
		expect(stash).not.toHaveBeenCalled();
		expect(openThreadForDraft).not.toHaveBeenCalled();
		expect(routerPush).not.toHaveBeenCalled();
	});

	it('Context B mints a thread, stashes the draft for it, and navigates there', async () => {
		openThreadForDraft.mockResolvedValue('t1');
		const { addSelectedNodesToChat } = useAddNodesToChat();
		await addSelectedNodesToChat({
			workflowId: 'w1',
			selectedNodeIds: ['n1'],
			workflow: wf,
			isInsideThread: false,
			workflowName: 'My workflow',
		});
		expect(openThreadForDraft).toHaveBeenCalledWith({
			id: 'w1',
			name: 'My workflow',
			snapshot: undefined,
		});
		expect(stash).toHaveBeenCalledWith('t1', expect.any(Array), 'w1');
		expect(routerPush).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 't1' },
		});
		expect(stageNodeSets).not.toHaveBeenCalled();
	});

	it('Context B aborts without stashing or navigating when thread provisioning fails', async () => {
		openThreadForDraft.mockResolvedValue(null);
		const { addSelectedNodesToChat } = useAddNodesToChat();
		await addSelectedNodesToChat({
			workflowId: 'w1',
			selectedNodeIds: ['n1'],
			workflow: wf,
			isInsideThread: false,
		});
		expect(stash).not.toHaveBeenCalled();
		expect(routerPush).not.toHaveBeenCalled();
	});

	it('empty selection is a no-op (nothing staged)', async () => {
		const { addSelectedNodesToChat } = useAddNodesToChat();
		await addSelectedNodesToChat({
			workflowId: 'w1',
			selectedNodeIds: [],
			workflow: wf,
			isInsideThread: true,
		});
		expect(stageNodeSets).not.toHaveBeenCalled();
	});
});
