import { render } from '@testing-library/vue';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';

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

function renderHost(workflowId: Ref<string>) {
	const Host = defineComponent({
		setup() {
			useCollaborationLifecycle(workflowId);
			return () => h('div');
		},
	});
	return render(Host);
}

describe('useCollaborationLifecycle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		visibility.value = 'visible';
	});

	it('initializes when workflowId is present', async () => {
		renderHost(ref('workflow-1'));
		await nextTick();

		expect(mockInitialize).toHaveBeenCalledWith('workflow-1');
		expect(mockTerminate).not.toHaveBeenCalled();
	});

	it('does not initialize when workflowId is empty', async () => {
		renderHost(ref(''));
		await nextTick();

		expect(mockInitialize).not.toHaveBeenCalled();
	});

	it('terminates the previous workflow and initializes the new one when workflowId changes', async () => {
		const workflowId = ref('workflow-1');
		renderHost(workflowId);
		await nextTick();
		expect(mockInitialize).toHaveBeenCalledWith('workflow-1');

		workflowId.value = 'workflow-2';
		await nextTick();

		expect(mockTerminate).toHaveBeenCalledTimes(1);
		expect(mockInitialize).toHaveBeenLastCalledWith('workflow-2');
	});

	it('initializes when workflowId transitions from empty to set', async () => {
		const workflowId = ref('');
		renderHost(workflowId);
		await nextTick();
		expect(mockInitialize).not.toHaveBeenCalled();

		workflowId.value = 'workflow-1';
		await nextTick();

		expect(mockTerminate).not.toHaveBeenCalled();
		expect(mockInitialize).toHaveBeenCalledWith('workflow-1');
	});

	it('terminates when workflowId becomes empty', async () => {
		const workflowId = ref('workflow-1');
		renderHost(workflowId);
		await nextTick();

		workflowId.value = '';
		await nextTick();

		expect(mockTerminate).toHaveBeenCalledTimes(1);
		expect(mockInitialize).toHaveBeenCalledTimes(1);
	});

	it('terminates on unmount', async () => {
		const rendered = renderHost(ref('workflow-1'));
		await nextTick();

		rendered.unmount();

		expect(mockTerminate).toHaveBeenCalledTimes(1);
	});

	it('stops heartbeat when document becomes hidden', async () => {
		renderHost(ref('workflow-1'));
		await nextTick();

		visibility.value = 'hidden';
		await nextTick();

		expect(mockStopHeartbeat).toHaveBeenCalled();
	});

	it('starts heartbeat when document becomes visible again', async () => {
		renderHost(ref('workflow-1'));
		await nextTick();

		visibility.value = 'hidden';
		await nextTick();
		visibility.value = 'visible';
		await nextTick();

		expect(mockStartHeartbeat).toHaveBeenCalled();
	});

	it('does not toggle heartbeat when no workflow is active', async () => {
		renderHost(ref(''));
		await nextTick();

		visibility.value = 'hidden';
		await nextTick();

		expect(mockStopHeartbeat).not.toHaveBeenCalled();
		expect(mockStartHeartbeat).not.toHaveBeenCalled();
	});
});
