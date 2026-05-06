import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiEmptyView from '../InstanceAiEmptyView.vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { SidebarStateKey } from '../instanceAiLayout';

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade: vi.fn() }),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const InstanceAiInputStub = defineComponent({
	name: 'InstanceAiInputStub',
	props: {
		suggestions: { type: Array, required: false },
		isStreaming: { type: Boolean, required: false },
	},
	setup(props, { expose }) {
		expose({ focus: vi.fn() });
		return () =>
			h(
				'div',
				{ 'data-test-id': 'instance-ai-input-stub' },
				props.suggestions === undefined ? 'unset' : String(props.suggestions.length),
			);
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
		const pinia = createTestingPinia({ stubActions: false });
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
});
