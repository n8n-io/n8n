import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowChatPanel from '../WorkflowChatPanel.vue';
import { useWorkflowChatPanelStore } from '../workflowChatPanel.store';

// Stub the heavy chat thread view — this smoke test only needs to know that
// the panel shell renders and forwards the threadId once the store opens.
vi.mock('@/features/ai/instanceAi/InstanceAiThreadView.vue', () => ({
	default: {
		name: 'InstanceAiThreadView',
		props: ['threadId'],
		template: '<div data-test-id="instance-ai-thread-stub">{{ threadId }}</div>',
	},
}));

vi.mock('@/features/ai/instanceAi/instanceAi.store', () => ({
	useInstanceAiStore: () => ({
		createWorkflowChatRuntime: vi.fn(),
		syncThread: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock('../useWorkflowContext', () => ({
	useWorkflowContext: () => ({ snapshot: () => undefined }),
}));

const renderComponent = createComponentRenderer(WorkflowChatPanel);

describe('WorkflowChatPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(
			createTestingPinia({
				createSpy: vi.fn,
				stubActions: false,
			}),
		);
	});

	it('renders the panel host with the workflow-chat data-testid', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('workflow-chat-panel')).toBeTruthy();
	});

	it('mounts the thread view once the panel is opened', async () => {
		const panelStore = useWorkflowChatPanelStore();
		panelStore.open();

		const { findByTestId } = renderComponent();
		const stub = await findByTestId('instance-ai-thread-stub');
		expect(stub).toBeTruthy();
		expect(stub.textContent).toBeTruthy();
	});
});
