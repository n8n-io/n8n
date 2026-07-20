import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createRunExecutionData } from 'n8n-workflow';
import type { ExecutionSummary } from 'n8n-workflow';

import { reconcileExecutionStateOnReconnect } from './reconcileOnReconnect';
import { getActiveExecutions } from '@/app/api/workflows';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { IWorkflowDb } from '@/Interface';
import type { PushHandlerOptions } from './types';

// Derives the workflow id from the route; resolve it directly without a router.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showMessage: vi.fn(), showError: vi.fn() }),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ setDocumentTitle: vi.fn() }),
}));

vi.mock('@/app/api/workflows', () => ({
	getActiveExecutions: vi.fn(),
}));

const getActiveExecutionsMock = vi.mocked(getActiveExecutions);

const workflowId = '1';
const documentId = createWorkflowDocumentId(workflowId);
const options: PushHandlerOptions = {
	router: mock<Router>(),
	documentId,
};

function startRunningExecution(executionId: string) {
	const executionStateStore = useWorkflowExecutionStateStore(documentId);
	useExecutionDataStore(createExecutionDataId(executionId)).setExecution(
		mock<IExecutionResponse>({
			id: executionId,
			workflowId,
			status: 'running',
			finished: false,
			data: { resultData: { runData: {} } },
		}),
	);
	executionStateStore.setActiveExecutionId(executionId);
	return executionStateStore;
}

function makeFinishedExecution(executionId: string): IExecutionResponse {
	const nodeName = 'Trigger';
	return {
		id: executionId,
		workflowId,
		finished: true,
		mode: 'manual',
		status: 'success',
		startedAt: new Date(),
		createdAt: new Date(),
		workflowData: mock<IWorkflowDb>({ id: workflowId, nodes: [], connections: {} }),
		data: createRunExecutionData({
			resultData: {
				lastNodeExecuted: nodeName,
				runData: {
					[nodeName]: [
						{
							executionStatus: 'success',
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
							data: { main: [[{ json: { ok: true } }]] },
						},
					],
				},
			},
		}),
	};
}

describe('reconcileExecutionStateOnReconnect', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		useWorkflowDocumentStore(documentId).setName('My Workflow');
	});

	it('clears the stranded spinner when the tracked run finished server-side while disconnected', async () => {
		const executionId = 'exec-finished-offline';
		const executionStateStore = startRunningExecution(executionId);
		expect(executionStateStore.isWorkflowRunning).toBe(true);

		// Server no longer lists the execution as active — it finished while the
		// client was disconnected, so its `executionFinished` push was dropped.
		getActiveExecutionsMock.mockResolvedValue([]);
		vi.spyOn(useWorkflowsStore(), 'fetchExecutionDataById').mockResolvedValue(
			makeFinishedExecution(executionId),
		);

		await reconcileExecutionStateOnReconnect(options);

		expect(getActiveExecutionsMock).toHaveBeenCalledWith(expect.anything(), {
			workflowId,
			status: ['new', 'running', 'waiting'],
		});
		// State reconciled to server truth: spinner cleared, final run displayed.
		expect(executionStateStore.isWorkflowRunning).toBe(false);
		expect(executionStateStore.activeExecutionId).toBeUndefined();
		expect(executionStateStore.displayedExecutionId).toBe(executionId);
	});

	it('leaves a genuinely running execution untouched on reconnect', async () => {
		const executionId = 'exec-still-running';
		const executionStateStore = startRunningExecution(executionId);

		// Server still reports the execution as active.
		getActiveExecutionsMock.mockResolvedValue([mock<ExecutionSummary>({ id: executionId })]);
		const fetchSpy = vi.spyOn(useWorkflowsStore(), 'fetchExecutionDataById');

		await reconcileExecutionStateOnReconnect(options);

		expect(executionStateStore.isWorkflowRunning).toBe(true);
		expect(executionStateStore.activeExecutionId).toBe(executionId);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('does nothing when no active execution is being tracked', async () => {
		const executionStateStore = useWorkflowExecutionStateStore(documentId);
		expect(executionStateStore.activeExecutionId).toBeUndefined();

		await reconcileExecutionStateOnReconnect(options);

		expect(getActiveExecutionsMock).not.toHaveBeenCalled();
	});

	it('does not reconcile a pending run whose backend id is not yet known', async () => {
		const executionStateStore = useWorkflowExecutionStateStore(documentId);
		executionStateStore.setActiveExecutionId(null);

		await reconcileExecutionStateOnReconnect(options);

		expect(getActiveExecutionsMock).not.toHaveBeenCalled();
		expect(executionStateStore.activeExecutionId).toBeNull();
	});

	it('leaves the canvas untouched when the active-executions request fails', async () => {
		const executionId = 'exec-network-error';
		const executionStateStore = startRunningExecution(executionId);

		getActiveExecutionsMock.mockRejectedValue(new Error('network down'));
		const fetchSpy = vi.spyOn(useWorkflowsStore(), 'fetchExecutionDataById');

		await reconcileExecutionStateOnReconnect(options);

		expect(executionStateStore.isWorkflowRunning).toBe(true);
		expect(executionStateStore.activeExecutionId).toBe(executionId);
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
