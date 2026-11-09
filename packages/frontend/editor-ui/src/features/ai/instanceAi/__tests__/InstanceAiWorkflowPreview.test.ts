import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { createRunExecutionData, type IPinData } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { defineComponent, h, inject, nextTick, reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
import { EditorEnabledFeaturesKey } from '@/app/constants/injectionKeys';
import { useLogsStore } from '@/app/stores/logs.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createTestNode } from '@/__tests__/mocks';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import type { RememberedManualExecution } from '../canvasPreview.utils';
import InstanceAiWorkflowPreview from '../components/InstanceAiWorkflowPreview.vue';

// Map-backed stand-in for the thread runtime's user-run memory. A plain Map (not the
// disposed execution-state store) so a remembered user run survives the simulated
// tab-switch dispose, exactly like the real per-thread runtime.
const rememberedManualExecutions = new Map<string, RememberedManualExecution>();

const { telemetryTrackSpy } = vi.hoisted(() => ({ telemetryTrackSpy: vi.fn() }));

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
	// Same shape as the runtime's logs panel memory; it survives the simulated tab switch.
	logsPanelMemory: {
		collapsedByUser: false,
		autoOpened: false,
		latestStartedExecutionIds: new Map<string, string>(),
	},
});

vi.mock('../instanceAi.store', () => ({
	useThread: () => thread,
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrackSpy }),
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
	initialNodeId?: string;
	/** Size of the artifact pane. jsdom has no layout, so the logs auto-open size gate reads this. */
	paneSize?: { width: number; height: number };
	/** Reuse the stores of an earlier mount, like a remount after a tab switch. */
	pinia?: TestingPinia;
}

async function mountPreview(options: MountPreviewOptions = {}) {
	const listeners: OnPushMessageHandler[] = [];
	const pinia = options.pinia ?? createTestingPinia({ stubActions: false });
	setActivePinia(pinia);

	const paneSize = options.paneSize ?? { width: 1200, height: 900 };
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
		...paneSize,
	} as DOMRect);

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
			initialNodeId: options.initialNodeId,
		},
		global: {
			stubs: {
				WorkflowCanvasHost: WorkflowCanvasHostStub,
			},
		},
	});
	await flushPromises();

	return { wrapper, listeners, workflowsStore, pinia };
}

function startExecution(
	listeners: OnPushMessageHandler[],
	executionId: string,
	source?: 'instance_ai',
) {
	for (const listener of listeners) {
		listener({
			type: 'executionStarted',
			data: {
				executionId,
				mode: 'manual',
				source,
				startedAt: new Date(),
				workflowId: 'wf-1',
				flattedRunData: '[]',
			},
		});
	}
}

function finishExecution(
	listeners: OnPushMessageHandler[],
	executionId: string,
	status: 'success' | 'error',
) {
	for (const listener of listeners) {
		listener({ type: 'executionFinished', data: { executionId, workflowId: 'wf-1', status } });
	}
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
		thread.logsPanelMemory.collapsedByUser = false;
		thread.logsPanelMemory.autoOpened = false;
		thread.logsPanelMemory.latestStartedExecutionIds.clear();
		telemetryTrackSpy.mockReset();
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

	it('opens the returned node once after the artifact workflow loads', async () => {
		const { wrapper } = await mountPreview({ initialNodeId: 'node-1' });
		const documentId = createWorkflowDocumentId('wf-1');
		useWorkflowDocumentStore(documentId).setNodes([
			createTestNode({ id: 'node-1', name: 'Returned node' }),
		]);
		const ndvStore = useNDVStore(documentId);

		await wrapper.get('[data-test-id="workflow-loaded"]').trigger('click');
		await nextTick();

		expect(ndvStore.activeNodeName).toBe('Returned node');
		expect(wrapper.emitted('initial-node-id-consumed')).toHaveLength(1);

		ndvStore.unsetActiveNodeName();
		await wrapper.get('[data-test-id="workflow-loaded"]').trigger('click');
		await nextTick();

		expect(ndvStore.activeNodeName).toBeNull();
		expect(wrapper.emitted('initial-node-id-consumed')).toHaveLength(1);
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

	describe('logs panel', () => {
		const toggleEvents = () =>
			telemetryTrackSpy.mock.calls
				.filter(([event]) => event === 'User toggled log view')
				.map(([, properties]) => properties);

		it('opens the panel when a run starts and collapses it when the run succeeds', async () => {
			const { listeners } = await mountPreview();
			const logsStore = useLogsStore();
			expect(logsStore.isOpen).toBe(false);

			// User run from the artifact canvas.
			startExecution(listeners, 'exec-user-1');
			expect(logsStore.isOpen).toBe(true);
			finishExecution(listeners, 'exec-user-1', 'success');
			expect(logsStore.isOpen).toBe(false);

			// Agent run while the artifact is open.
			startExecution(listeners, 'exec-agent-2', 'instance_ai');
			expect(logsStore.isOpen).toBe(true);
			finishExecution(listeners, 'exec-agent-2', 'success');
			expect(logsStore.isOpen).toBe(false);

			expect(toggleEvents()).toEqual([
				{ new_state: 'attached', source: 'auto', context: 'artifact' },
				{ new_state: 'collapsed', source: 'auto', context: 'artifact' },
				{ new_state: 'attached', source: 'auto', context: 'artifact' },
				{ new_state: 'collapsed', source: 'auto', context: 'artifact' },
			]);
		});

		it('keeps the panel open when the run fails', async () => {
			const { listeners } = await mountPreview();
			const logsStore = useLogsStore();

			startExecution(listeners, 'exec-user-1');
			finishExecution(listeners, 'exec-user-1', 'error');

			expect(logsStore.isOpen).toBe(true);
		});

		it('stops opening the panel for the thread after the user collapses it', async () => {
			const { listeners } = await mountPreview();
			const logsStore = useLogsStore();

			startExecution(listeners, 'exec-user-1');
			logsStore.toggleOpen(false); // the user collapses the panel
			finishExecution(listeners, 'exec-user-1', 'success');
			startExecution(listeners, 'exec-agent-2', 'instance_ai');

			expect(thread.logsPanelMemory.collapsedByUser).toBe(true);
			expect(logsStore.isOpen).toBe(false);
			expect(toggleEvents()).toHaveLength(1);
		});

		it('leaves a panel the user opened open after a successful run', async () => {
			const { listeners } = await mountPreview();
			const logsStore = useLogsStore();
			logsStore.toggleOpen(true); // the user opens the panel

			startExecution(listeners, 'exec-user-1');
			finishExecution(listeners, 'exec-user-1', 'success');

			expect(logsStore.isOpen).toBe(true);
			expect(toggleEvents()).toHaveLength(0);
		});

		it.each([
			['narrow', { width: 649, height: 900 }],
			['short', { width: 1200, height: 599 }],
		])('does not open the panel when the pane is too %s', async (_label, paneSize) => {
			const { listeners } = await mountPreview({ paneSize });
			const logsStore = useLogsStore();

			startExecution(listeners, 'exec-user-1');

			expect(logsStore.isOpen).toBe(false);
		});

		it('does not open the panel for executions of other workflows', async () => {
			const { listeners } = await mountPreview();
			const logsStore = useLogsStore();

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

		it('collapses the panel after a tab switch when the run that opened it succeeds', async () => {
			const first = await mountPreview();
			const logsStore = useLogsStore();
			startExecution(first.listeners, 'exec-user-1');
			expect(logsStore.isOpen).toBe(true);

			// A tab switch and back remounts the preview on the same thread runtime.
			first.wrapper.unmount();
			const { listeners } = await mountPreview({ pinia: first.pinia });
			finishExecution(listeners, 'exec-user-1', 'success');

			expect(logsStore.isOpen).toBe(false);
			expect(toggleEvents()).toHaveLength(2);
		});

		// Another artifact tab is active: the preview stays mounted but hidden.
		// jsdom caches computed styles until a stylesheet changes, so append one.
		const hidePreview = (wrapper: Awaited<ReturnType<typeof mountPreview>>['wrapper']) => {
			wrapper.element.setAttribute('style', 'visibility: hidden');
			document.head.appendChild(document.createElement('style'));
		};

		it('does not open the panel for a run of a hidden tab', async () => {
			const { wrapper, listeners } = await mountPreview();
			const logsStore = useLogsStore();
			hidePreview(wrapper);

			startExecution(listeners, 'exec-user-1');

			expect(logsStore.isOpen).toBe(false);
			expect(toggleEvents()).toHaveLength(0);
		});

		it('does not collapse the panel for a run of a hidden tab', async () => {
			const { wrapper, listeners } = await mountPreview();
			const logsStore = useLogsStore();
			startExecution(listeners, 'exec-user-1');
			expect(logsStore.isOpen).toBe(true);

			hidePreview(wrapper);
			finishExecution(listeners, 'exec-user-1', 'success');

			expect(logsStore.isOpen).toBe(true);
			expect(toggleEvents()).toHaveLength(1);
		});
	});
});
