import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiView from '../InstanceAiView.vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade: vi.fn() }),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => ({
		params: {},
		path: '/instance-ai',
		matched: [],
		fullPath: '/instance-ai',
		query: {},
		hash: '',
		meta: {},
	}),
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@vueuse/core', async (importOriginal) => ({
	...(await importOriginal()),
	useScroll: () => ({ arrivedState: { bottom: true } }),
	useWindowSize: () => ({ width: ref(1200) }),
	useLocalStorage: (_key: string, defaultValue: unknown) => ref(defaultValue),
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

const renderView = createComponentRenderer(InstanceAiView, {
	global: {
		stubs: {
			InstanceAiInput: InstanceAiInputStub,
		},
	},
});

describe('InstanceAiView', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;
	let settingsStore: ReturnType<typeof mockedStore<typeof useInstanceAiSettingsStore>>;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		store = mockedStore(useInstanceAiStore);
		settingsStore = mockedStore(useInstanceAiSettingsStore);
		const pushStore = mockedStore(usePushConnectionStore);

		store.currentThreadId = 'thread-1';
		store.loadThreads.mockResolvedValue(true);
		store.fetchCredits.mockResolvedValue(undefined);
		store.loadHistoricalMessages.mockResolvedValue('applied');
		store.connectSSE.mockResolvedValue(undefined);
		store.closeSSE.mockReturnValue(undefined);
		settingsStore.isLocalGatewayDisabled = true;
		settingsStore.refreshModuleSettings.mockResolvedValue(undefined);
		pushStore.pushConnect.mockReturnValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('passes the fixed suggestions to the empty-state composer', () => {
		const { getByTestId } = renderView();
		expect(getByTestId('instance-ai-input-stub')).toHaveTextContent('4');
	});

	it('does not pass suggestions once the thread has messages', () => {
		store.hasMessages = true;
		store.messages = [
			{
				id: 'msg-1',
				role: 'user',
				content: 'hello',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
			},
		] as typeof store.messages;

		const { getByTestId } = renderView();
		expect(getByTestId('instance-ai-input-stub')).toHaveTextContent('unset');
	});

	it('does not pass suggestions while an existing thread is hydrating', () => {
		store.isHydratingThread = true;

		const { getByTestId } = renderView();
		expect(getByTestId('instance-ai-input-stub')).toHaveTextContent('unset');
	});

	it('does not reconnect when direct hydration is stale', async () => {
		store.sseState = 'disconnected';
		store.loadHistoricalMessages.mockResolvedValue('stale');

		renderView();

		await vi.waitFor(() => {
			expect(store.loadHistoricalMessages).toHaveBeenCalledWith('thread-1');
		});
		expect(store.loadThreadStatus).not.toHaveBeenCalled();
		expect(store.connectSSE).not.toHaveBeenCalled();
	});

	it('reconnects on same-thread re-entry when hydration is skipped', async () => {
		store.currentThreadId = 'thread-1';
		store.sseState = 'disconnected';
		store.hasMessages = true;
		store.messages = [
			{
				id: 'msg-history',
				role: 'assistant',
				content: 'already loaded',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
			},
		] as typeof store.messages;
		store.loadHistoricalMessages.mockResolvedValue('skipped');

		renderView();

		await vi.waitFor(() => {
			expect(store.loadHistoricalMessages).toHaveBeenCalledWith('thread-1');
		});
		expect(store.loadThreadStatus).toHaveBeenCalledWith('thread-1');
		expect(store.connectSSE).toHaveBeenCalledWith('thread-1');
	});
});
