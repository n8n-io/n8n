import { setActivePinia, createPinia } from 'pinia';
import { describe, beforeEach, expect, it } from 'vitest';
import { createRunExecutionData } from 'n8n-workflow';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import {
	createWorkflowExecutionSessionId,
	disposeWorkflowExecutionSessionStore,
	useWorkflowExecutionSessionStore,
} from './workflowExecutionSession.store';
import { createExecutionDataId, useExecutionDataStore } from './executionData.store';

function createExecution(id: string, workflowId: string, status: IExecutionResponse['status']) {
	return {
		id,
		workflowId,
		finished: status === 'success',
		mode: 'manual',
		status,
		createdAt: new Date(),
		startedAt: new Date(),
		workflowData: { id: workflowId, name: 'Workflow', active: false, nodes: [], connections: {} },
		data: createRunExecutionData({ resultData: { runData: {} } }),
	} as IExecutionResponse;
}

describe('useWorkflowExecutionSessionStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('isolates store instances by workflow id', () => {
		const first = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('workflow-1'));
		const second = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('workflow-2'));

		first.setActiveExecutionId('exec-1');

		expect(first.activeExecutionId).toBe('exec-1');
		expect(second.activeExecutionId).toBeUndefined();
	});

	it('tracks active execution id state and running state', () => {
		const session = useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId('workflow-1'),
		);

		expect(session.activeExecutionId).toBeUndefined();
		expect(session.isWorkflowRunning).toBe(false);

		session.setActiveExecutionId(null);
		expect(session.isWorkflowRunning).toBe(true);

		useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
			createExecution('exec-1', 'workflow-1', 'running'),
		);
		session.setActiveExecutionId('exec-1');
		expect(session.previousExecutionId).toBeNull();
		expect(session.isWorkflowRunning).toBe(true);

		useExecutionDataStore(createExecutionDataId('exec-2')).setExecution(
			createExecution('exec-2', 'workflow-1', 'success'),
		);
		session.setActiveExecutionId('exec-2');
		expect(session.previousExecutionId).toBe('exec-1');
		expect(session.isWorkflowRunning).toBe(false);

		session.setActiveExecutionId(undefined);
		expect(session.activeExecutionId).toBeUndefined();
	});

	it('filters current executions and stores last successful execution by id', () => {
		const session = useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId('workflow-1'),
		);
		const execution = createExecution('exec-1', 'workflow-1', 'success');

		session.setCurrentWorkflowExecutions([
			{ id: 'exec-1', workflowId: 'workflow-1' },
			{ id: 'exec-2', workflowId: 'workflow-2' },
		]);
		session.setLastSuccessfulExecution(execution);

		expect(session.currentWorkflowExecutions).toEqual([{ id: 'exec-1', workflowId: 'workflow-1' }]);
		expect(session.lastSuccessfulExecutionId).toBe('exec-1');
		expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution).toEqual(execution);
	});

	it('delegates active execution data reads and writes', () => {
		const session = useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId('workflow-1'),
		);
		const execution = createExecution('exec-1', 'workflow-1', 'running');

		session.setActiveExecutionId('exec-1');
		session.setCurrentExecution(execution);

		expect(session.currentExecution).toEqual(execution);
		expect(session.currentExecutionRunData).toEqual(execution.data?.resultData.runData);

		session.addNodeExecutionStartedData({
			executionId: 'exec-1',
			nodeName: 'Start',
			data: { startTime: 1, executionIndex: 0, source: [] },
		});
		expect(session.currentExecutionStartedData?.[1].Start).toHaveLength(1);

		session.clearNodeExecutionData('Start');
		expect(session.currentExecutionRunData?.Start).toBeUndefined();
	});

	it('resets and disposes only targeted workflow session state', () => {
		const first = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('workflow-1'));
		const second = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('workflow-2'));
		first.setActiveExecutionId('exec-1');
		second.setActiveExecutionId('exec-2');

		first.resetExecutionSession();
		expect(first.activeExecutionId).toBeUndefined();
		expect(second.activeExecutionId).toBe('exec-2');

		disposeWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('workflow-2'));
		expect(
			useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('workflow-2'))
				.activeExecutionId,
		).toBeUndefined();
	});
});
