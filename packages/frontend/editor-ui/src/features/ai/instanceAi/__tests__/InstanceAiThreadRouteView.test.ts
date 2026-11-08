import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { getSystemAgentThread } from '@/features/agents/composables/useAgentApi';

import { rememberAssistantAgentThread } from '../assistantAgent/assistantAgentThreads';
import { useAssistantAgentThreadsStore } from '../assistantAgent/assistantAgentThreads.store';
import { useInstanceAiStore } from '../instanceAi.store';
import InstanceAiThreadRouteView from '../InstanceAiThreadRouteView.vue';

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	getSystemAgentThread: vi.fn(),
}));

vi.mock('../InstanceAiThreadView.vue', () => ({
	default: defineComponent({
		props: { threadId: { type: String, required: true } },
		setup: (props) => () => h('div', { 'data-test-id': 'assistant-thread-view' }, props.threadId),
	}),
}));

vi.mock('../assistantAgent/AssistantAgentThreadView.vue', () => ({
	default: defineComponent({
		props: {
			threadId: { type: String, required: true },
			projectId: { type: String, required: true },
		},
		setup: (props) => () =>
			h('div', { 'data-test-id': 'agent-thread-view' }, `${props.threadId}:${props.projectId}`),
	}),
}));

const renderView = createComponentRenderer(InstanceAiThreadRouteView);

function setAssistantAgentEnabled(enabled: boolean) {
	useSettingsStore().moduleSettings = {
		'instance-ai': {
			enabled: true,
			mcpConnectionsAvailable: false,
			browserUseEnabled: false,
			proxyEnabled: false,
			cloudManaged: false,
			sandboxEnabled: true,
			workflowBuilderAvailable: true,
			sandboxUnavailableReason: null,
			runDebugEnabled: false,
			workflowSuggestionsEnabled: false,
			assistantAgentEnabled: enabled,
		},
	};
}

describe('InstanceAiThreadRouteView', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;

	beforeEach(() => {
		vi.mocked(getSystemAgentThread).mockReset();
		setActivePinia(createTestingPinia());
		store = mockedStore(useInstanceAiStore);
		store.threads = [];
	});

	it('opens the current Assistant thread view while the Assistant agent is off', async () => {
		setAssistantAgentEnabled(false);

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });
		await flushPromises();

		expect(getByTestId('assistant-thread-view')).toHaveTextContent('thread-1');
		expect(getSystemAgentThread).not.toHaveBeenCalled();
	});

	it('opens a listed current Assistant thread without a lookup', async () => {
		setAssistantAgentEnabled(true);
		store.threads = [{ id: 'listed-thread' }] as typeof store.threads;

		const { getByTestId } = renderView({ props: { threadId: 'listed-thread' } });
		await flushPromises();

		expect(getByTestId('assistant-thread-view')).toBeInTheDocument();
		expect(getSystemAgentThread).not.toHaveBeenCalled();
	});

	it('opens a thread that this tab created on the Assistant agent without a lookup', async () => {
		setAssistantAgentEnabled(true);
		rememberAssistantAgentThread('new-agent-thread', 'project-1');

		const { getByTestId } = renderView({ props: { threadId: 'new-agent-thread' } });
		await flushPromises();

		expect(getByTestId('agent-thread-view')).toHaveTextContent('new-agent-thread:project-1');
		expect(getSystemAgentThread).not.toHaveBeenCalled();
	});

	it('looks up an unknown thread and opens it on the Assistant agent when it is there', async () => {
		setAssistantAgentEnabled(true);
		vi.mocked(getSystemAgentThread).mockResolvedValue({
			id: 'agent-thread',
			title: null,
			updatedAt: '2026-10-25T10:00:00.000Z',
			projectId: 'project-2',
		});

		const { getByTestId, queryByTestId } = renderView({ props: { threadId: 'agent-thread' } });
		expect(getByTestId('instance-ai-thread-route-loading')).toBeInTheDocument();
		await flushPromises();

		expect(getSystemAgentThread).toHaveBeenCalledWith(
			expect.anything(),
			'assistant',
			'agent-thread',
		);
		expect(getByTestId('agent-thread-view')).toHaveTextContent('agent-thread:project-2');
		expect(queryByTestId('assistant-thread-view')).not.toBeInTheDocument();
		// The lists get the thread from the lookup, so the thread view does not request it again.
		expect(mockedStore(useAssistantAgentThreadsStore).addOpenedThread).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'agent-thread', projectId: 'project-2' }),
		);
	});

	it('opens an unknown thread that the agents runtime does not have in the current Assistant', async () => {
		setAssistantAgentEnabled(true);
		vi.mocked(getSystemAgentThread).mockRejectedValue(
			Object.assign(new Error('Session not found'), { httpStatusCode: 404 }),
		);

		const { getByTestId } = renderView({ props: { threadId: 'old-thread' } });
		await flushPromises();

		expect(getByTestId('assistant-thread-view')).toHaveTextContent('old-thread');
	});

	it('shows an error with a retry when the lookup fails for another reason', async () => {
		setAssistantAgentEnabled(true);
		vi.mocked(getSystemAgentThread).mockRejectedValueOnce(
			Object.assign(new Error('Bad gateway'), { httpStatusCode: 502 }),
		);

		const { getByTestId, queryByTestId } = renderView({
			props: { threadId: 'unreachable-thread' },
		});
		await flushPromises();

		expect(getByTestId('instance-ai-thread-route-error')).toBeInTheDocument();
		expect(queryByTestId('assistant-thread-view')).not.toBeInTheDocument();
		expect(queryByTestId('agent-thread-view')).not.toBeInTheDocument();

		vi.mocked(getSystemAgentThread).mockResolvedValueOnce({
			id: 'unreachable-thread',
			title: null,
			updatedAt: '2026-10-25T10:00:00.000Z',
			projectId: 'project-2',
		});
		await fireEvent.click(getByTestId('instance-ai-thread-route-retry'));
		await flushPromises();

		expect(getByTestId('agent-thread-view')).toHaveTextContent('unreachable-thread:project-2');
		expect(queryByTestId('instance-ai-thread-route-error')).not.toBeInTheDocument();
	});
});
