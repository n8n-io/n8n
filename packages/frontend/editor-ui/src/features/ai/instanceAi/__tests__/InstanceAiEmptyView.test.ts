import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiEmptyView from '../InstanceAiEmptyView.vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { SidebarStateKey } from '../instanceAiLayout';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';

const { replaceMock, showErrorMock } = vi.hoisted(() => ({
	replaceMock: vi.fn(),
	showErrorMock: vi.fn(),
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

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

const InstanceAiInputStub = defineComponent({
	name: 'InstanceAiInputStub',
	props: {
		suggestions: { type: Array, required: false },
		isStreaming: { type: Boolean, required: false },
	},
	emits: ['submit', 'stop'],
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

	beforeEach(() => {
		// Default `stubActions: true` — every store action becomes a no-op spy.
		// We only need to assert the call happened; the bodies of store actions
		// touch the thread runtime (SSE etc.) which we don't exercise here.
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		store = mockedStore(useInstanceAiStore);
		store.currentThreadId = 'thread-placeholder';
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

	it('clears the current thread on mount (AI-2408)', () => {
		// Without this, currentThreadId keeps pointing at the last visited thread
		// and the sidebar would highlight it alongside the empty main view.
		renderView();
		expect(store.clearCurrentThread).toHaveBeenCalled();
	});

	it('navigates to the thread view and dispatches sendMessage when syncThread succeeds', async () => {
		store.syncThread.mockResolvedValue(undefined);
		const { getByTestId } = renderView();

		await fireEvent.click(getByTestId('instance-ai-input-stub-submit'));
		await flushPromises();

		expect(store.syncThread).toHaveBeenCalledWith('thread-placeholder');
		expect(store.sendMessage).toHaveBeenCalledWith('hello', undefined, 'test-push-ref');
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
		expect(store.sendMessage).not.toHaveBeenCalled();
		expect(replaceMock).not.toHaveBeenCalled();
	});
});
