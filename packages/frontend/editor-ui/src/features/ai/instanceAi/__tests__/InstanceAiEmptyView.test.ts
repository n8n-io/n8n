import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiEmptyView from '../InstanceAiEmptyView.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import { SidebarStateKey } from '../instanceAiLayout';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';

const { experimentMocks, replaceMock, showErrorMock } = vi.hoisted(() => ({
	experimentMocks: {
		proactiveAgentEnabled: { value: false },
	},
	replaceMock: vi.fn(),
	showErrorMock: vi.fn(),
}));

vi.mock('@/experiments/instanceAiProactiveAgent', () => ({
	useInstanceAiProactiveAgentExperiment: () => ({
		isFeatureEnabled: experimentMocks.proactiveAgentEnabled,
	}),
	InstanceAiProactiveStarterMessage: {
		name: 'InstanceAiProactiveStarterMessageStub',
		template: '<div data-test-id="instance-ai-proactive-starter">starter</div>',
	},
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade: vi.fn() }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ pushRef: 'test-push-ref' }),
}));

vi.mock('uuid', () => ({
	v4: () => 'thread-placeholder',
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

const InstanceAiInputStub = defineComponent({
	name: 'InstanceAiInputStub',
	props: {
		suggestions: { type: Array, required: false },
		isStreaming: { type: Boolean, required: false },
		isSubmitting: { type: Boolean, required: false },
	},
	emits: ['submit'],
	setup(props, { emit, expose }) {
		expose({ focus: vi.fn() });
		return () =>
			h('div', { 'data-test-id': 'instance-ai-input-stub' }, [
				h('span', {}, props.suggestions === undefined ? 'unset' : String(props.suggestions.length)),
				h(
					'button',
					{
						'data-test-id': 'instance-ai-input-stub-submit',
						onClick: () => emit('submit', 'hello'),
					},
					'submit',
				),
			]);
	},
});

const renderView = createComponentRenderer(InstanceAiEmptyView, {
	global: {
		provide: {
			[SidebarStateKey as symbol]: { collapsed: ref(false), toggle: vi.fn() },
		},
		stubs: {
			InstanceAiInput: InstanceAiInputStub,
		},
	},
});

describe('InstanceAiEmptyView', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;
	let thread: ThreadRuntime;

	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		store = mockedStore(useInstanceAiStore);
		thread = {
			id: 'thread-placeholder',
			isStreaming: false,
			isSubmitting: false,
			isAwaitingConfirmation: false,
			amendContext: null,
			contextualSuggestion: null,
			sendMessage: vi.fn().mockResolvedValue(undefined),
		} as unknown as ThreadRuntime;
		store.getOrCreateRuntime.mockReturnValue(thread);
		experimentMocks.proactiveAgentEnabled.value = false;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('passes the fixed suggestions to the empty-state composer', () => {
		const { getByTestId } = renderView();
		// 4 suggestions in INSTANCE_AI_EMPTY_STATE_SUGGESTIONS — suggestions array
		// renders as its `.length`.
		expect(getByTestId('instance-ai-input-stub')).toHaveTextContent('4');
	});

	it('renders the proactive starter and moves suggestions out of the composer when enabled', () => {
		experimentMocks.proactiveAgentEnabled.value = true;

		const { getByTestId, queryByTestId } = renderView();

		expect(getByTestId('instance-ai-proactive-starter')).toHaveTextContent('starter');
		expect(queryByTestId('instance-ai-empty-state')).not.toBeInTheDocument();
		expect(getByTestId('instance-ai-input-stub')).toHaveTextContent('unset');
	});

	it('does not create a runtime before the first send', () => {
		renderView();
		expect(store.getOrCreateRuntime).not.toHaveBeenCalled();
	});

	it('navigates to the thread view and dispatches sendMessage when syncThread succeeds', async () => {
		store.syncThread.mockResolvedValue(undefined);
		const { getByTestId } = renderView();

		await fireEvent.click(getByTestId('instance-ai-input-stub-submit'));
		await flushPromises();

		expect(store.syncThread).toHaveBeenCalledWith('thread-placeholder');
		expect(store.getOrCreateRuntime).toHaveBeenCalledWith('thread-placeholder');
		expect(thread.sendMessage).toHaveBeenCalledWith('hello', undefined, 'test-push-ref');
		expect(replaceMock).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-placeholder' },
		});
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('shows a toast and stays on the empty view when syncThread rejects', async () => {
		store.syncThread.mockRejectedValue(new Error('persist failed'));
		const { getByTestId } = renderView();

		await fireEvent.click(getByTestId('instance-ai-input-stub-submit'));
		await flushPromises();

		expect(showErrorMock).toHaveBeenCalled();
		expect(store.getOrCreateRuntime).not.toHaveBeenCalled();
		expect(thread.sendMessage).not.toHaveBeenCalled();
		expect(replaceMock).not.toHaveBeenCalled();
	});
});
