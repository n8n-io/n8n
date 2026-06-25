import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { createRunExecutionData, type IPinData } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { defineComponent, h, nextTick, reactive } from 'vue';
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
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import InstanceAiWorkflowPreview from '../components/InstanceAiWorkflowPreview.vue';

const thread = reactive({
	messages: [],
	consumePendingHandoff: vi.fn(),
	sendMessage: vi.fn(),
});

vi.mock('../instanceAi.store', () => ({
	useThread: () => thread,
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
		return () =>
			h(
				'button',
				{
					'data-test-id': 'workflow-loaded',
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
}

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
		},
		global: {
			stubs: {
				WorkflowCanvasHost: WorkflowCanvasHostStub,
			},
		},
	});
	await flushPromises();

	return { wrapper, listeners, workflowsStore };
}

describe('InstanceAiWorkflowPreview', () => {
	beforeEach(() => {
		thread.messages = [];
		thread.consumePendingHandoff.mockReset();
		thread.sendMessage.mockReset();
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
});
