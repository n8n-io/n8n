import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { createRunExecutionData, type IPinData } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { defineComponent, h, inject, nextTick, reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	usePushConnectionStore,
	type OnPushMessageHandler,
} from '@/app/stores/pushConnection.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import {
	disposeWorkflowExecutionStateStore,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { requestCanvasTidyUp } from '@/features/workflows/canvas/pendingCanvasTidyUp';
import { EditorEnabledFeaturesKey } from '@/app/constants/injectionKeys';
import { useLogsStore } from '@/app/stores/logs.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { RememberedManualExecution } from '../canvasPreview.utils';
import InstanceAiWorkflowPreview from '../components/InstanceAiWorkflowPreview.vue';

// Map-backed stand-in for the thread runtime's user-run memory. A plain Map (not the
// disposed execution-state store) so a remembered user run survives the simulated
// tab-switch dispose, exactly like the real per-thread runtime.
const rememberedManualExecutions = new Map<string, RememberedManualExecution>();

const thread = reactive({
	messages: [],
	isStreaming: false,
	isHydratingThread: false,
	isSendingMessage: false,
	consumePendingHandoff: vi.fn(),
	sendMessage: vi.fn(),
	rememberManualExecution: (
		workflowId: string,
		executionId: string,
		agentExecutionId: string | undefined,
	) => rememberedManualExecutions.set(workflowId, { executionId, agentExecutionId }),
	getRememberedManualExecution: (workflowId: string) => rememberedManualExecutions.get(workflowId),
	forgetManualExecution: (workflowId: string) => rememberedManualExecutions.delete(workflowId),
});

vi.mock('../instanceAi.store', () => ({
	useThread: () => thread,
}));

vi.mock('@/features/workflows/canvas/pendingCanvasTidyUp', () => ({
	requestCanvasTidyUp: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const WorkflowCanvasHostStub = defineComponent({
	name: 'WorkflowCanvasHost',
	emits: ['workflow-loaded'],
	setup(_, { emit, expose }) {
		expose({ requestFitView: vi.fn() });
		// Surfaces the host's read-only override so the editing lock is assertable.
		const features = inject(EditorEnabledFeaturesKey, null);
		return () =>
			h(
				'button',
				{
					'data-test-id': 'workflow-loaded',
					'data-read-only': String(features?.value.readOnly ?? false),
					onClick: () => emit('workflow-loaded', 'wf-1'),
				},
				'loaded',
			);
	},
});

interface MakeExecutionOptions {
	workflowPinData?: IPinData;
	resultPinData?: IPinData;
	includeResultPinData?: boolean;
}

function makeExecution(id: string, options: MakeExecutionOptions = {}): IExecutionResponse {
	const resultPinData = options.resultPinData ?? { Mocked: [{ json: { source: id } }] };

	return {
		id,
		workflowId: 'wf-1',
		finished: true,
		mode: 'manual',
		status: 'success',
		createdAt: new Date('2026-06-24T12:00:00.000Z'),
		startedAt: new Date('2026-06-24T12:00:00.000Z'),
		stoppedAt: new Date('2026-06-24T12:00:01.000Z'),
		workflowData: {
			id: 'wf-1',
			name: 'Workflow',
			active: false,
			isArchived: false,
			createdAt: '2026-06-24T12:00:00.000Z',
			updatedAt: '2026-06-24T12:00:01.000Z',
			nodes: [],
			connections: {},
			settings: { executionOrder: 'v1' },
			versionId: 'version-1',
			activeVersionId: null,
			...(options.workflowPinData !== undefined ? { pinData: options.workflowPinData } : {}),
		},
		data: createRunExecutionData({
			resultData: {
				runData: {},
				...(options.includeResultPinData === false ? {} : { pinData: resultPinData }),
			},
		}),
	};
}

interface MountPreviewOptions {
	executionFactory?: (executionId: string) => IExecutionResponse;
	executionResult?: { executionId: string; status: 'success' | 'error' };
	pendingTidyWorkflowId?: string | null;
}

// Unmounted after each test — a stale mounted component would keep reacting to
// the shared `thread` mock and pollute later tests.
const mountedWrappers: Array<{ unmount: () => void }> = [];

async function mountPreview(options: MountPreviewOptions = {}) {
	const listeners: OnPushMessageHandler[] = [];
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);

	const pushStore = usePushConnectionStore();
	vi.spyOn(pushStore, 'addEventListener').mockImplementation((handler) => {
		listeners.push(handler);
		return () => {};
	});

	const workflowsStore = useWorkflowsStore();
	vi.spyOn(workflowsStore, 'fetchExecutionDataById').mockImplementation(async (executionId) =>
		(options.executionFactory ?? makeExecution)(executionId),
	);
	const executionResult: MountPreviewOptions['executionResult'] =
		'executionResult' in options
			? options.executionResult
			: { executionId: 'exec-agent-1', status: 'success' };

	const wrapper = mount(InstanceAiWorkflowPreview, {
		props: {
			workflowId: 'wf-1',
			executionResult,
			pendingTidyWorkflowId: options.pendingTidyWorkflowId ?? null,
		},
		global: {
			stubs: {
				WorkflowCanvasHost: WorkflowCanvasHostStub,
			},
		},
	});
	await flushPromises();
	mountedWrappers.push(wrapper);

	return { wrapper, listeners, workflowsStore };
}

describe('InstanceAiWorkflowPreview', () => {
	beforeEach(() => {
		thread.messages = [];
		thread.isStreaming = false;
		thread.isHydratingThread = false;
		thread.isSendingMessage = false;
		thread.consumePendingHandoff.mockReset();
		thread.sendMessage.mockReset();
		rememberedManualExecutions.clear();
	});

	afterEach(() => {
		for (const wrapper of mountedWrappers.splice(0)) {
			wrapper.unmount();
		}
	});

	describe('editing lock', () => {
		const readOnly = (wrapper: Awaited<ReturnType<typeof mountPreview>>['wrapper']) =>
			wrapper.find('[data-test-id="workflow-loaded"]').attributes('data-read-only');

		it('leaves the canvas editable while the agent is idle', async () => {
			const { wrapper } = await mountPreview();

			expect(readOnly(wrapper)).toBe('false');
		});

		it.each([
			['isStreaming', 'isStreaming'],
			['isHydratingThread', 'isHydratingThread'],
			['isSendingMessage', 'isSendingMessage'],
		] as const)('locks the canvas while %s', async (_label, flag) => {
			const { wrapper } = await mountPreview();

			thread[flag] = true;
			await nextTick();

			expect(readOnly(wrapper)).toBe('true');
		});
	});

	describe('post-build auto tidy-up', () => {
		const tidyPayload = {
			workflowId: 'wf-1',
			source: 'builder-update',
			trackEvents: false,
			trackHistory: false,
			trackBulk: false,
		};

		function addGroupToDocument() {
			const docStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));
			docStore.setNodeGroups([{ id: 'group-1', name: 'Group', nodeIds: ['node-1'] }]);
		}

		// The module mock is shared across tests — reset per test
		function tidyRequestMock() {
			const mock = vi.mocked(requestCanvasTidyUp);
			mock.mockClear();
			return mock;
		}

		function tidyEmits(mock: ReturnType<typeof tidyRequestMock>) {
			return mock.mock.calls;
		}

		it('emits a deferred tidy-up once loaded and idle, and consumes the marker', async () => {
			const emitSpy = tidyRequestMock();
			const { wrapper } = await mountPreview({ pendingTidyWorkflowId: 'wf-1' });
			addGroupToDocument();

			// Reload still in flight (no workflow-loaded yet) → nothing emitted
			expect(tidyEmits(emitSpy)).toHaveLength(0);
			expect(wrapper.emitted('tidy-up-consumed')).toBeUndefined();

			await wrapper.get('[data-test-id="workflow-loaded"]').trigger('click');
			await flushPromises();

			expect(tidyEmits(emitSpy)).toHaveLength(1);
			expect(tidyEmits(emitSpy)[0][0]).toEqual(tidyPayload);
			expect(wrapper.emitted('tidy-up-consumed')).toHaveLength(1);
		});

		it('tidies intermediate reloads without consuming, then consumes on the final tidy', async () => {
			const emitSpy = tidyRequestMock();
			thread.isStreaming = true;
			const { wrapper } = await mountPreview({ pendingTidyWorkflowId: 'wf-1' });
			addGroupToDocument();

			await wrapper.get('[data-test-id="workflow-loaded"]').trigger('click');
			await flushPromises();

			// Agent still working → intermediate (visual) tidy, marker kept
			expect(tidyEmits(emitSpy)).toHaveLength(1);
			expect(wrapper.emitted('tidy-up-consumed')).toBeUndefined();

			thread.isStreaming = false;
			await flushPromises();

			// Agent idle → final tidy, marker consumed
			expect(tidyEmits(emitSpy)).toHaveLength(2);
			expect(wrapper.emitted('tidy-up-consumed')).toHaveLength(1);
		});

		it('does nothing when the marker is for a different workflow', async () => {
			const emitSpy = tidyRequestMock();
			const { wrapper } = await mountPreview({ pendingTidyWorkflowId: 'wf-other' });
			addGroupToDocument();

			await wrapper.get('[data-test-id="workflow-loaded"]').trigger('click');
			await flushPromises();

			expect(tidyEmits(emitSpy)).toHaveLength(0);
			expect(wrapper.emitted('tidy-up-consumed')).toBeUndefined();
		});

		it('consumes the marker without tidying when the workflow has no groups', async () => {
			const emitSpy = tidyRequestMock();
			const { wrapper } = await mountPreview({ pendingTidyWorkflowId: 'wf-1' });

			await wrapper.get('[data-test-id="workflow-loaded"]').trigger('click');
			await flushPromises();

			expect(tidyEmits(emitSpy)).toHaveLength(0);
			expect(wrapper.emitted('tidy-up-consumed')).toHaveLength(1);
		});

		it('skips while a refresh is in flight and retries on the next workflow-loaded', async () => {
			const emitSpy = tidyRequestMock();
			thread.isStreaming = true;
			const { wrapper } = await mountPreview({ pendingTidyWorkflowId: 'wf-1' });
			addGroupToDocument();

			// Establish a loaded baseline first, so the refresh below is a real
			// mid-flight reload and not just "never loaded yet".
			await wrapper.get('[data-test-id="workflow-loaded"]').trigger('click');
			await flushPromises();
			expect(tidyEmits(emitSpy)).toHaveLength(1);

			// A refresh starts (e.g. the next build chunk's own reload).
			await wrapper.setProps({ refreshKey: 1 });
			await flushPromises();

			// The agent goes idle *while that reload is still in flight* — this
			// would normally fire the final tidy, but must be skipped and retried
			// once the canvas reports loaded again, not silently dropped.
			thread.isStreaming = false;
			await flushPromises();
			expect(tidyEmits(emitSpy)).toHaveLength(1);
			expect(wrapper.emitted('tidy-up-consumed')).toBeUndefined();

			await wrapper.get('[data-test-id="workflow-loaded"]').trigger('click');
			await flushPromises();

			expect(tidyEmits(emitSpy)).toHaveLength(2);
			expect(wrapper.emitted('tidy-up-consumed')).toHaveLength(1);
		});
	});

	it('restores the cached agent execution after the artifact workflow reloads', async () => {
		const { wrapper, workflowsStore } = await mountPreview();
		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));

		expect(executionState.displayedExecutionId).toBe('exec-agent-1');

		executionState.resetExecutionState();
		expect(executionState.displayedExecutionId).toBeUndefined();

		await wrapper.get('[data-test-id="workflow-loaded"]').trigger('click');
		await nextTick();

		expect(executionState.displayedExecutionId).toBe('exec-agent-1');
		expect(useExecutionDataStore(createExecutionDataId('exec-agent-1')).execution).toMatchObject({
			id: 'exec-agent-1',
		});
		expect(workflowsStore.fetchExecutionDataById).toHaveBeenCalledTimes(1);
	});

	it('restores the cached agent execution after workflow setup reload disposes state', async () => {
		const { wrapper, workflowsStore } = await mountPreview();
		const documentId = createWorkflowDocumentId('wf-1');
		const executionState = useWorkflowExecutionStateStore(documentId);

		expect(executionState.displayedExecutionId).toBe('exec-agent-1');

		executionState.resetExecutionState();
		disposeWorkflowExecutionStateStore(executionState);

		await wrapper.get('[data-test-id="workflow-loaded"]').trigger('click');
		await nextTick();

		const restoredExecutionState = useWorkflowExecutionStateStore(documentId);
		expect(restoredExecutionState.displayedExecutionId).toBe('exec-agent-1');
		expect(restoredExecutionState.activeExecutionPinDataByNodeName).toEqual({
			Mocked: [{ json: { source: 'exec-agent-1' } }],
		});
		expect(workflowsStore.fetchExecutionDataById).toHaveBeenCalledTimes(1);
	});

	it('restores execution pin data from the workflow snapshot when result data omits it', async () => {
		const workflowPinData: IPinData = { Mocked: [{ json: { source: 'workflow-snapshot' } }] };

		await mountPreview({
			executionFactory: (executionId) =>
				makeExecution(executionId, {
					workflowPinData,
					includeResultPinData: false,
				}),
		});

		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
		expect(executionState.activeExecutionPinDataByNodeName).toEqual(workflowPinData);
		expect(
			useExecutionDataStore(createExecutionDataId('exec-agent-1')).execution?.data?.resultData
				.pinData,
		).toEqual(workflowPinData);
	});

	it('retries restoring the agent execution after Instance AI startup state clears', async () => {
		const { wrapper, listeners } = await mountPreview({
			executionResult: undefined,
		});
		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));

		for (const listener of listeners) {
			listener({
				type: 'executionStarted',
				data: {
					executionId: 'exec-agent-1',
					mode: 'manual',
					source: 'instance_ai',
					startedAt: new Date(),
					workflowId: 'wf-1',
					flattedRunData: '[]',
				},
			});
		}

		await wrapper.setProps({
			executionResult: { executionId: 'exec-agent-1', status: 'success' },
		});
		await flushPromises();
		expect(executionState.displayedExecutionId).toBeUndefined();

		executionState.setActiveExecutionId(undefined);
		await nextTick();

		expect(executionState.displayedExecutionId).toBe('exec-agent-1');
		expect(executionState.activeExecutionPinDataByNodeName).toEqual({
			Mocked: [{ json: { source: 'exec-agent-1' } }],
		});
	});

	it('does not let a stale agent execution replace an active user execution', async () => {
		const { wrapper } = await mountPreview();
		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));

		executionState.setActiveExecutionId('exec-user-1');

		await wrapper.setProps({
			executionResult: { executionId: 'exec-agent-2', status: 'success' },
		});
		await flushPromises();

		expect(executionState.activeExecutionId).toBe('exec-user-1');
		expect(executionState.displayedExecutionId).toBe('exec-user-1');
	});

	it('does not restore the previous agent execution after a user execution starts', async () => {
		const { wrapper, listeners } = await mountPreview();
		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));

		for (const listener of listeners) {
			listener({
				type: 'executionStarted',
				data: {
					executionId: 'exec-user-1',
					mode: 'manual',
					startedAt: new Date(),
					workflowId: 'wf-1',
					flattedRunData: '[]',
				},
			});
		}
		executionState.setActiveExecutionId('exec-user-1');
		executionState.setActiveExecutionId(undefined);
		executionState.setDisplayedExecutionId('exec-user-1');

		await wrapper.get('[data-test-id="workflow-loaded"]').trigger('click');
		await nextTick();

		expect(executionState.displayedExecutionId).toBe('exec-user-1');
	});

	it('does not reset a different active execution when an Instance AI execution starts', async () => {
		const { listeners } = await mountPreview();
		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));

		executionState.setActiveExecutionId('exec-user-1');

		for (const listener of listeners) {
			listener({
				type: 'executionStarted',
				data: {
					executionId: 'exec-agent-2',
					mode: 'manual',
					source: 'instance_ai',
					startedAt: new Date(),
					workflowId: 'wf-1',
					flattedRunData: '[]',
				},
			});
		}

		expect(executionState.activeExecutionId).toBe('exec-user-1');
	});

	it('restores the user execution after a tab switch disposes preview state', async () => {
		const { wrapper, listeners, workflowsStore } = await mountPreview();
		const documentId = createWorkflowDocumentId('wf-1');
		const executionState = useWorkflowExecutionStateStore(documentId);

		// Agent run is shown when the preview first opens.
		expect(executionState.displayedExecutionId).toBe('exec-agent-1');

		// User triggers a manual run in the embedded canvas.
		for (const listener of listeners) {
			listener({
				type: 'executionStarted',
				data: {
					executionId: 'exec-user-1',
					mode: 'manual',
					startedAt: new Date(),
					workflowId: 'wf-1',
					flattedRunData: '[]',
				},
			});
		}

		// Switching artifact tabs unmounts the canvas and disposes its execution state.
		executionState.resetExecutionState();
		disposeWorkflowExecutionStateStore(executionState);

		// Switching back reloads the workflow.
		await wrapper.get('[data-test-id="workflow-loaded"]').trigger('click');
		await flushPromises();

		const restoredExecutionState = useWorkflowExecutionStateStore(documentId);
		expect(restoredExecutionState.displayedExecutionId).toBe('exec-user-1');
		expect(workflowsStore.fetchExecutionDataById).toHaveBeenLastCalledWith('exec-user-1');
	});

	it('prefers a newer agent run over the remembered user run after the agent re-runs', async () => {
		const { wrapper, listeners, workflowsStore } = await mountPreview();
		const documentId = createWorkflowDocumentId('wf-1');
		const executionState = useWorkflowExecutionStateStore(documentId);

		// User triggers a manual run while the agent run (exec-agent-1) is showing.
		for (const listener of listeners) {
			listener({
				type: 'executionStarted',
				data: {
					executionId: 'exec-user-1',
					mode: 'manual',
					startedAt: new Date(),
					workflowId: 'wf-1',
					flattedRunData: '[]',
				},
			});
		}

		// Tab switch disposes the canvas state.
		executionState.resetExecutionState();
		disposeWorkflowExecutionStateStore(executionState);

		// While on another tab, the agent runs the workflow again.
		await wrapper.setProps({ executionResult: { executionId: 'exec-agent-2', status: 'success' } });
		await flushPromises();

		// Switching back reloads the workflow.
		await wrapper.get('[data-test-id="workflow-loaded"]').trigger('click');
		await flushPromises();

		const restoredExecutionState = useWorkflowExecutionStateStore(documentId);
		expect(restoredExecutionState.displayedExecutionId).toBe('exec-agent-2');
		expect(workflowsStore.fetchExecutionDataById).toHaveBeenLastCalledWith('exec-agent-2');
	});

	it('opens the logs panel when an execution starts for the previewed workflow', async () => {
		const { listeners } = await mountPreview();
		const logsStore = useLogsStore();
		logsStore.toggleOpen(false);

		// User run from the embedded canvas.
		for (const listener of listeners) {
			listener({
				type: 'executionStarted',
				data: {
					executionId: 'exec-user-1',
					mode: 'manual',
					startedAt: new Date(),
					workflowId: 'wf-1',
					flattedRunData: '[]',
				},
			});
		}
		expect(logsStore.isOpen).toBe(true);

		// Agent run while the artifact is open.
		logsStore.toggleOpen(false);
		for (const listener of listeners) {
			listener({
				type: 'executionStarted',
				data: {
					executionId: 'exec-agent-2',
					mode: 'manual',
					source: 'instance_ai',
					startedAt: new Date(),
					workflowId: 'wf-1',
					flattedRunData: '[]',
				},
			});
		}
		expect(logsStore.isOpen).toBe(true);
	});

	it('does not open the logs panel for executions of other workflows', async () => {
		const { listeners } = await mountPreview();
		const logsStore = useLogsStore();
		logsStore.toggleOpen(false);

		for (const listener of listeners) {
			listener({
				type: 'executionStarted',
				data: {
					executionId: 'exec-other-1',
					mode: 'manual',
					startedAt: new Date(),
					workflowId: 'wf-2',
					flattedRunData: '[]',
				},
			});
		}

		expect(logsStore.isOpen).toBe(false);
	});
});
