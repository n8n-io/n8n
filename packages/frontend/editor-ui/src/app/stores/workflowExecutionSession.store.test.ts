import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRunExecutionData, type ExecutionSummary } from 'n8n-workflow';

import { STORES } from '@n8n/stores';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import { MANUAL_TRIGGER_NODE_TYPE, SET_NODE_TYPE } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import {
	createWorkflowExecutionSessionId,
	disposeWorkflowExecutionSessionStore,
	getWorkflowExecutionSessionStoreId,
	useWorkflowExecutionSessionStore,
} from '@/app/stores/workflowExecutionSession.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

function createExecution(
	id: string,
	overrides: Partial<IExecutionResponse> = {},
): IExecutionResponse {
	return createTestWorkflowExecutionResponse({
		id,
		status: 'running',
		finished: false,
		workflowData: createTestWorkflow({
			id: 'workflow-1',
			nodes: [
				createTestNode({ name: 'Manual Trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
				createTestNode({ name: 'Set', type: SET_NODE_TYPE }),
			],
		}),
		data: createRunExecutionData({
			resultData: {
				runData: {},
			},
		}),
		...overrides,
	});
}

function createSummary(
	id: string,
	workflowId: string,
	overrides: Partial<ExecutionSummary> = {},
): ExecutionSummary {
	return {
		id,
		workflowId,
		finished: false,
		mode: 'manual',
		status: 'running',
		startedAt: new Date('2026-04-29T00:00:00.000Z'),
		createdAt: new Date('2026-04-29T00:00:00.000Z'),
		workflowName: `Workflow ${workflowId}`,
		...overrides,
	} as ExecutionSummary;
}

describe('workflowExecutionSession.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('creates isolated stores keyed by workflow id', () => {
		expect(createWorkflowExecutionSessionId('workflow-1')).toBe('workflow-1');
		expect(getWorkflowExecutionSessionStoreId('workflow-1')).toBe(
			`${STORES.WORKFLOW_EXECUTION_SESSIONS}/workflow-1`,
		);

		const firstStore = useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId('workflow-1'),
		);
		const secondStore = useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId('workflow-2'),
		);

		firstStore.setActiveExecutionId('exec-1');
		secondStore.setActiveExecutionId('exec-2');
		firstStore.appendChatMessage('hello');
		secondStore.setExecutionWaitingForWebhook(true);

		expect(firstStore.activeExecutionId).toBe('exec-1');
		expect(firstStore.chatMessages).toEqual(['hello']);
		expect(firstStore.executionWaitingForWebhook).toBe(false);
		expect(secondStore.activeExecutionId).toBe('exec-2');
		expect(secondStore.chatMessages).toEqual([]);
		expect(secondStore.executionWaitingForWebhook).toBe(true);
	});

	it('tracks active and previous execution ids', () => {
		const store = useWorkflowExecutionSessionStore('workflow-1');

		expect(store.activeExecutionId).toBeUndefined();
		expect(store.previousExecutionId).toBeUndefined();

		store.setActiveExecutionId('exec-1');
		expect(store.activeExecutionId).toBe('exec-1');
		expect(store.previousExecutionId).toBeUndefined();

		store.setActiveExecutionId('exec-2');
		expect(store.activeExecutionId).toBe('exec-2');
		expect(store.previousExecutionId).toBe('exec-1');

		store.setActiveExecutionId(null);
		expect(store.activeExecutionId).toBeNull();
		expect(store.previousExecutionId).toBe('exec-1');

		store.setActiveExecutionId(undefined);
		expect(store.activeExecutionId).toBeUndefined();
	});

	it('computes whether the workflow is running', () => {
		const store = useWorkflowExecutionSessionStore('workflow-1');

		store.setActiveExecutionId(null);
		expect(store.isWorkflowRunning).toBe(true);

		store.setActiveExecutionId('missing-execution');
		expect(store.isWorkflowRunning).toBe(false);

		useExecutionDataStore(createExecutionDataId('running-execution')).setExecution(
			createExecution('running-execution', { status: 'running', finished: false }),
		);
		store.setActiveExecutionId('running-execution');
		expect(store.isWorkflowRunning).toBe(true);

		useExecutionDataStore(createExecutionDataId('waiting-execution')).setExecution(
			createExecution('waiting-execution', { status: 'waiting', finished: false }),
		);
		store.setActiveExecutionId('waiting-execution');
		expect(store.isWorkflowRunning).toBe(true);

		useExecutionDataStore(createExecutionDataId('finished-execution')).setExecution(
			createExecution('finished-execution', { status: 'success', finished: true }),
		);
		store.setActiveExecutionId('finished-execution');
		expect(store.isWorkflowRunning).toBe(false);
	});

	it('computes the execution trigger node name', () => {
		useNodeTypesStore().setNodeTypes([
			{
				name: MANUAL_TRIGGER_NODE_TYPE,
				displayName: 'Manual Trigger',
				group: ['trigger'],
				version: 1,
				description: '',
				defaults: { name: 'Manual Trigger' },
				inputs: [],
				outputs: ['main'],
				properties: [],
			},
			{
				name: SET_NODE_TYPE,
				displayName: 'Set',
				group: ['transform'],
				version: 1,
				description: '',
				defaults: { name: 'Set' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
			},
		]);

		const store = useWorkflowExecutionSessionStore('workflow-1');
		useExecutionDataStore(createExecutionDataId('explicit-trigger')).setExecution(
			createExecution('explicit-trigger', {
				triggerNode: 'Manual Trigger',
			}),
		);
		store.setActiveExecutionId('explicit-trigger');
		expect(store.executionTriggerNodeName).toBe('Manual Trigger');

		useExecutionDataStore(createExecutionDataId('inferred-trigger')).setExecution(
			createExecution('inferred-trigger', {
				triggerNode: undefined,
				data: createRunExecutionData({
					resultData: {
						runData: {
							'Manual Trigger': [],
							Set: [],
						},
					},
				}),
			}),
		);
		store.setActiveExecutionId('inferred-trigger');
		expect(store.executionTriggerNodeName).toBe('Manual Trigger');

		useExecutionDataStore(createExecutionDataId('no-trigger')).setExecution(
			createExecution('no-trigger', {
				triggerNode: undefined,
				data: createRunExecutionData({
					resultData: {
						runData: {
							Set: [],
						},
					},
				}),
			}),
		);
		store.setActiveExecutionId('no-trigger');
		expect(store.executionTriggerNodeName).toBeUndefined();
	});

	it('filters and deduplicates current workflow executions by workflow id', () => {
		const store = useWorkflowExecutionSessionStore('workflow-1');

		store.setCurrentWorkflowExecutions([
			createSummary('exec-1', 'workflow-1'),
			createSummary('exec-1', 'workflow-1'),
			createSummary('exec-2', 'workflow-2'),
			createSummary('exec-3', 'workflow-1', { finished: true }),
		]);

		expect(store.currentWorkflowExecutions.map(({ id }) => id)).toEqual(['exec-1', 'exec-3']);
		expect(store.getAllLoadedFinishedExecutions.map(({ id }) => id)).toEqual(['exec-3']);

		store.addToCurrentExecutions([
			createSummary('exec-3', 'workflow-1'),
			createSummary('exec-4', 'workflow-1'),
			createSummary('exec-5', 'workflow-2'),
		]);
		expect(store.currentWorkflowExecutions.map(({ id }) => id)).toEqual([
			'exec-1',
			'exec-3',
			'exec-4',
		]);

		store.deleteExecution('exec-1');
		expect(store.currentWorkflowExecutions.map(({ id }) => id)).toEqual(['exec-3', 'exec-4']);
	});

	it('stores last successful execution separately from active execution state', () => {
		const store = useWorkflowExecutionSessionStore('workflow-1');
		const execution = createExecution('successful-execution', {
			status: 'success',
			finished: true,
		});

		store.setLastSuccessfulExecution(execution);

		expect(store.lastSuccessfulExecutionId).toBe('successful-execution');
		expect(store.lastSuccessfulExecution).toEqual(execution);
		expect(useExecutionDataStore(createExecutionDataId('successful-execution')).execution).toEqual(
			execution,
		);
		expect(store.activeExecution).toBeNull();
		expect(store.activeExecutionRunData).toBeNull();
		expect(store.getActiveExecutionDataStore()).toBeNull();

		store.setLastSuccessfulExecution(null);
		expect(store.lastSuccessfulExecutionId).toBeNull();
		expect(store.lastSuccessfulExecution).toBeNull();
		expect(store.activeExecution).toBeNull();
		expect(useExecutionDataStore(createExecutionDataId('successful-execution')).execution).toEqual(
			execution,
		);
	});

	it('keeps a displayed manual execution visible after active execution id is cleared', () => {
		const store = useWorkflowExecutionSessionStore('workflow-1');
		const execution = createExecution('manual-execution');
		useExecutionDataStore(createExecutionDataId('manual-execution')).setExecution(execution);

		store.setActiveExecutionId('manual-execution');
		expect(store.activeExecution).toEqual(execution);
		expect(store.activeExecutionRunData).toEqual({});

		store.setActiveExecutionId(undefined);

		expect(store.activeExecutionId).toBeUndefined();
		expect(store.displayedExecutionId).toBe('manual-execution');
		expect(store.activeExecution).toEqual(execution);
		expect(store.activeExecutionRunData).toEqual({});
	});

	it('does not clear displayed execution data when there is no active execution', () => {
		const store = useWorkflowExecutionSessionStore('workflow-1');
		const execution = createExecution('manual-execution', {
			status: 'success',
			finished: true,
			data: createRunExecutionData({
				resultData: {
					runData: {
						'Manual Trigger': [createTestTaskData()],
						Set: [createTestTaskData()],
					},
				},
			}),
		});
		const executionDataStore = useExecutionDataStore(createExecutionDataId('manual-execution'));
		executionDataStore.setExecution(execution);

		store.setActiveExecutionId('manual-execution');
		store.setActiveExecutionId(undefined);
		store.clearActiveNodeExecutionData('Set');

		expect(store.activeExecutionId).toBeUndefined();
		expect(store.displayedExecutionId).toBe('manual-execution');
		expect(executionDataStore.executionRunData?.Set).toHaveLength(1);
		expect(store.activeExecutionRunData?.Set).toHaveLength(1);
	});

	it('clears node data for the active execution only', () => {
		const store = useWorkflowExecutionSessionStore('workflow-1');
		const execution = createExecution('active-execution', {
			data: createRunExecutionData({
				resultData: {
					runData: {
						'Manual Trigger': [createTestTaskData()],
						Set: [createTestTaskData()],
					},
				},
			}),
		});
		const executionDataStore = useExecutionDataStore(createExecutionDataId('active-execution'));
		executionDataStore.setExecution(execution);
		store.setActiveExecutionId('active-execution');

		store.clearActiveNodeExecutionData('Set');

		expect(executionDataStore.executionRunData?.Set).toBeUndefined();
		expect(executionDataStore.executionRunData?.['Manual Trigger']).toHaveLength(1);
	});

	it('clears node data for a pending execution', () => {
		const store = useWorkflowExecutionSessionStore('workflow-1');
		store.setPendingExecution(
			createExecution('pending-execution', {
				data: createRunExecutionData({
					resultData: {
						runData: {
							'Manual Trigger': [createTestTaskData()],
							Set: [createTestTaskData()],
						},
					},
				}),
			}),
		);
		store.setActiveExecutionId(null);

		store.clearActiveNodeExecutionData('Set');

		expect(store.activeExecutionRunData?.Set).toBeUndefined();
		expect(store.activeExecutionRunData?.['Manual Trigger']).toHaveLength(1);
	});

	it('clears displayed execution without clearing last successful execution', () => {
		const store = useWorkflowExecutionSessionStore('workflow-1');
		const displayedExecution = createExecution('manual-execution');
		const lastSuccessfulExecution = createExecution('successful-execution', {
			status: 'success',
			finished: true,
		});

		useExecutionDataStore(createExecutionDataId('manual-execution')).setExecution(
			displayedExecution,
		);
		store.setActiveExecutionId('manual-execution');
		store.setActiveExecutionId(undefined);
		store.setLastSuccessfulExecution(lastSuccessfulExecution);

		expect(store.activeExecution).toEqual(displayedExecution);
		expect(store.lastSuccessfulExecution).toEqual(lastSuccessfulExecution);

		store.clearDisplayedExecution();

		expect(store.displayedExecutionId).toBeUndefined();
		expect(store.activeExecution).toBeNull();
		expect(store.activeExecutionRunData).toBeNull();
		expect(store.getActiveExecutionDataStore()).toBeNull();
		expect(store.lastSuccessfulExecutionId).toBe('successful-execution');
		expect(store.lastSuccessfulExecution).toEqual(lastSuccessfulExecution);
	});

	it('resets and disposes only the targeted workflow session store', () => {
		const firstStore = useWorkflowExecutionSessionStore('workflow-1');
		const secondStore = useWorkflowExecutionSessionStore('workflow-2');

		firstStore.setActiveExecutionId('exec-1');
		firstStore.appendChatMessage('first');
		secondStore.setActiveExecutionId('exec-2');
		secondStore.appendChatMessage('second');

		firstStore.resetExecutionSession();
		expect(firstStore.activeExecutionId).toBeUndefined();
		expect(firstStore.chatMessages).toEqual([]);
		expect(secondStore.activeExecutionId).toBe('exec-2');
		expect(secondStore.chatMessages).toEqual(['second']);

		firstStore.setActiveExecutionId('exec-3');
		disposeWorkflowExecutionSessionStore('workflow-1');

		const recreatedFirstStore = useWorkflowExecutionSessionStore('workflow-1');
		expect(recreatedFirstStore.activeExecutionId).toBeUndefined();
		expect(secondStore.activeExecutionId).toBe('exec-2');
	});
});
