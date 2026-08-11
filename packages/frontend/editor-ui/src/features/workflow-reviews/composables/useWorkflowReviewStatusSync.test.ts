import type { PushMessage } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { defineComponent, h, nextTick, ref } from 'vue';

import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import { useWorkflowReviewStatusSync } from './useWorkflowReviewStatusSync';

const isWorkflowReviewsEnabled = ref(true);
vi.mock('@/features/workflow-reviews/composables/useWorkflowReviewsFeature', () => ({
	useWorkflowReviewsFeature: () => ({ isWorkflowReviewsEnabled }),
}));

const onDocumentVisibleHandlers: Array<() => void> = [];
vi.mock('@/app/composables/useDocumentVisibility', () => ({
	useDocumentVisibility: () => ({
		isVisible: { value: true },
		onDocumentVisible: (handler: () => void) => onDocumentVisibleHandlers.push(handler),
		onDocumentHidden: vi.fn(),
	}),
}));

const collaboratorsChanged = (workflowId: string): PushMessage => ({
	type: 'collaboratorsChanged',
	data: { workflowId, collaborators: [] },
});

const reviewStateChanged = (workflowId: string): PushMessage => ({
	type: 'workflowReviewStateChanged',
	data: { workflowId },
});

describe('useWorkflowReviewStatusSync', () => {
	let pushStore: ReturnType<typeof mockedStore<typeof usePushConnectionStore>>;
	let reviewStatusStore: ReturnType<typeof mockedStore<typeof useWorkflowReviewStatusStore>>;
	let pushHandlers: Array<(event: PushMessage) => void>;
	let removePushListener: ReturnType<typeof vi.fn<() => void>>;

	const emitPush = (event: PushMessage) => {
		pushHandlers.forEach((handler) => handler(event));
	};

	function mountComposable(workflowId: Parameters<typeof useWorkflowReviewStatusSync>[0]) {
		return renderComponent(
			defineComponent({
				setup() {
					useWorkflowReviewStatusSync(workflowId);
					return () => h('div');
				},
			}),
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		onDocumentVisibleHandlers.length = 0;
		isWorkflowReviewsEnabled.value = true;
		setActivePinia(createTestingPinia());

		pushStore = mockedStore(usePushConnectionStore);
		reviewStatusStore = mockedStore(useWorkflowReviewStatusStore);

		pushStore.isConnected = true;
		pushHandlers = [];
		removePushListener = vi.fn<() => void>();
		pushStore.addEventListener.mockImplementation((handler) => {
			pushHandlers.push(handler);
			// Like the real store, removing the listener stops delivery.
			removePushListener.mockImplementation(() => {
				pushHandlers = pushHandlers.filter((registered) => registered !== handler);
			});
			return removePushListener;
		});
		reviewStatusStore.fetchStatus.mockResolvedValue(undefined);
	});

	it('fetches on mount when the feature is enabled', async () => {
		mountComposable(() => 'workflow-1');
		await nextTick();

		expect(reviewStatusStore.fetchStatus).toHaveBeenCalledTimes(1);
		expect(reviewStatusStore.fetchStatus).toHaveBeenCalledWith('workflow-1');
	});

	it('does not fetch when the feature is disabled', async () => {
		isWorkflowReviewsEnabled.value = false;

		mountComposable(() => 'workflow-1');
		await nextTick();

		expect(reviewStatusStore.fetchStatus).not.toHaveBeenCalled();
	});

	it('does not fetch when the workflow id is undefined', async () => {
		mountComposable(() => undefined);
		await nextTick();

		expect(reviewStatusStore.fetchStatus).not.toHaveBeenCalled();
	});

	it('refetches on a review state change for the current workflow, ignoring other workflows', async () => {
		mountComposable(() => 'workflow-1');
		await nextTick();
		reviewStatusStore.fetchStatus.mockClear();

		emitPush(reviewStateChanged('workflow-other'));
		expect(reviewStatusStore.fetchStatus).not.toHaveBeenCalled();

		emitPush(reviewStateChanged('workflow-1'));
		expect(reviewStatusStore.fetchStatus).toHaveBeenCalledTimes(1);
		expect(reviewStatusStore.fetchStatus).toHaveBeenCalledWith('workflow-1');
	});

	it('ignores push messages of unrelated types', async () => {
		mountComposable(() => 'workflow-1');
		await nextTick();
		reviewStatusStore.fetchStatus.mockClear();

		emitPush(collaboratorsChanged('workflow-1'));
		expect(reviewStatusStore.fetchStatus).not.toHaveBeenCalled();
	});

	it('refetches when the push connection is restored, but not when it drops', async () => {
		mountComposable(() => 'workflow-1');
		await nextTick();
		reviewStatusStore.fetchStatus.mockClear();

		pushStore.isConnected = false;
		await nextTick();
		expect(reviewStatusStore.fetchStatus).not.toHaveBeenCalled();

		pushStore.isConnected = true;
		await nextTick();
		expect(reviewStatusStore.fetchStatus).toHaveBeenCalledTimes(1);
	});

	it('refetches for the new workflow when the active workflow id changes', async () => {
		const workflowId = ref<string | undefined>('workflow-1');
		mountComposable(() => workflowId.value);
		await nextTick();
		reviewStatusStore.fetchStatus.mockClear();

		workflowId.value = 'workflow-2';
		await nextTick();

		expect(reviewStatusStore.fetchStatus).toHaveBeenCalledTimes(1);
		expect(reviewStatusStore.fetchStatus).toHaveBeenCalledWith('workflow-2');
	});

	it('refetches when the browser tab becomes visible again', async () => {
		mountComposable(() => 'workflow-1');
		await nextTick();
		reviewStatusStore.fetchStatus.mockClear();

		onDocumentVisibleHandlers.forEach((handler) => handler());

		expect(reviewStatusStore.fetchStatus).toHaveBeenCalledTimes(1);
	});

	it('removes the push listener and stops refetching after unmount', async () => {
		const rendered = mountComposable(() => 'workflow-1');
		await nextTick();
		reviewStatusStore.fetchStatus.mockClear();

		rendered.unmount();

		expect(removePushListener).toHaveBeenCalledTimes(1);
		emitPush(reviewStateChanged('workflow-1'));
		expect(reviewStatusStore.fetchStatus).not.toHaveBeenCalled();
	});
});
