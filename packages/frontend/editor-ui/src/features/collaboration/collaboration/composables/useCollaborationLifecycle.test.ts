import { setActivePinia, createPinia } from 'pinia';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';

import { useCollaborationLifecycle } from './useCollaborationLifecycle';

const mockInitialize = vi.fn();
const mockTerminate = vi.fn();
const mockStartHeartbeat = vi.fn();
const mockStopHeartbeat = vi.fn();
const visibility = ref<'visible' | 'hidden'>('visible');

vi.mock('../collaboration.store', () => ({
	useCollaborationStore: () => ({
		initialize: mockInitialize,
		terminate: mockTerminate,
		startHeartbeat: mockStartHeartbeat,
		stopHeartbeat: mockStopHeartbeat,
	}),
}));

vi.mock('@vueuse/core', () => ({
	useDocumentVisibility: () => visibility,
}));

const wrappers: Array<VueWrapper> = [];

function createHost(workflowId: Ref<string>, enabled: Ref<boolean>) {
	return defineComponent({
		setup() {
			useCollaborationLifecycle(workflowId, { enabled });
			return () => h('div');
		},
	});
}

function mountHost(workflowId: Ref<string>, enabled: Ref<boolean>) {
	const wrapper = mount(createHost(workflowId, enabled));
	wrappers.push(wrapper);
	return wrapper;
}

describe('useCollaborationLifecycle', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		visibility.value = 'visible';
	});

	afterEach(() => {
		while (wrappers.length > 0) {
			wrappers.pop()?.unmount();
		}
	});

	test('initializes when workflowId is present and enabled', async () => {
		const workflowId = ref('workflow-1');
		const enabled = ref(true);
		mountHost(workflowId, enabled);
		await nextTick();

		expect(mockInitialize).toHaveBeenCalledWith('workflow-1');
		expect(mockTerminate).not.toHaveBeenCalled();
	});

	test('does not initialize when workflowId is empty', async () => {
		const workflowId = ref('');
		const enabled = ref(true);
		mountHost(workflowId, enabled);
		await nextTick();

		expect(mockInitialize).not.toHaveBeenCalled();
	});

	test('does not initialize when disabled', async () => {
		const workflowId = ref('workflow-1');
		const enabled = ref(false);
		mountHost(workflowId, enabled);
		await nextTick();

		expect(mockInitialize).not.toHaveBeenCalled();
	});

	test('terminates and re-initializes when workflowId changes', async () => {
		const workflowId = ref('workflow-1');
		const enabled = ref(true);
		mountHost(workflowId, enabled);
		await nextTick();

		expect(mockInitialize).toHaveBeenCalledWith('workflow-1');

		workflowId.value = 'workflow-2';
		await nextTick();

		expect(mockTerminate).toHaveBeenCalledTimes(1);
		expect(mockInitialize).toHaveBeenLastCalledWith('workflow-2');
	});

	test('initializes when workflowId transitions from empty to set', async () => {
		const workflowId = ref('');
		const enabled = ref(true);
		mountHost(workflowId, enabled);
		await nextTick();
		expect(mockInitialize).not.toHaveBeenCalled();

		workflowId.value = 'workflow-1';
		await nextTick();

		expect(mockTerminate).not.toHaveBeenCalled();
		expect(mockInitialize).toHaveBeenCalledWith('workflow-1');
	});

	test('terminates when workflowId becomes empty', async () => {
		const workflowId = ref('workflow-1');
		const enabled = ref(true);
		mountHost(workflowId, enabled);
		await nextTick();

		workflowId.value = '';
		await nextTick();

		expect(mockTerminate).toHaveBeenCalledTimes(1);
	});

	test('terminates on unmount', async () => {
		const workflowId = ref('workflow-1');
		const enabled = ref(true);
		const wrapper = mountHost(workflowId, enabled);
		await nextTick();

		wrapper.unmount();

		expect(mockTerminate).toHaveBeenCalledTimes(1);
	});

	test('stops heartbeat when document becomes hidden', async () => {
		const workflowId = ref('workflow-1');
		const enabled = ref(true);
		mountHost(workflowId, enabled);
		await nextTick();

		visibility.value = 'hidden';
		await nextTick();

		expect(mockStopHeartbeat).toHaveBeenCalled();
	});

	test('starts heartbeat when document becomes visible again', async () => {
		const workflowId = ref('workflow-1');
		const enabled = ref(true);
		mountHost(workflowId, enabled);
		await nextTick();

		visibility.value = 'hidden';
		await nextTick();
		visibility.value = 'visible';
		await nextTick();

		expect(mockStartHeartbeat).toHaveBeenCalled();
	});

	test('does not toggle heartbeat when no workflow is active', async () => {
		const workflowId = ref('');
		const enabled = ref(true);
		mountHost(workflowId, enabled);
		await nextTick();

		visibility.value = 'hidden';
		await nextTick();

		expect(mockStopHeartbeat).not.toHaveBeenCalled();
		expect(mockStartHeartbeat).not.toHaveBeenCalled();
	});
});
