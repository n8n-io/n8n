import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createRunExecutionData, type ExecutionSummary } from 'n8n-workflow';
import { FORM_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE } from '@/app/constants';
import { createTestNode, createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import { useExecutionDataStore } from '@/app/stores/executionData.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowExecutionSessionStore } from './workflowExecutionSession.store';

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({
		id: overrides.id ?? crypto.randomUUID(),
		name: overrides.name ?? 'Test Node',
		type: overrides.type ?? MANUAL_TRIGGER_NODE_TYPE,
		typeVersion: overrides.typeVersion ?? 1,
		disabled: overrides.disabled ?? false,
		...overrides,
	}) as INodeUi;
}

function createExecutionSummary(overrides: Partial<ExecutionSummary> = {}): ExecutionSummary {
	return {
		id: 'execution-1',
		mode: 'manual',
		createdAt: new Date('2026-04-01T00:00:00.000Z'),
		startedAt: new Date('2026-04-01T00:00:00.000Z'),
		workflowId: 'wf-1',
		status: 'running',
		...overrides,
	};
}

describe('useWorkflowExecutionSessionStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('isolates session state by workflow id', () => {
		const firstSession = useWorkflowExecutionSessionStore('wf-1');
		const secondSession = useWorkflowExecutionSessionStore('wf-2');

		firstSession.setActiveExecutionId('execution-1');
		secondSession.setActiveExecutionId('execution-2');

		expect(firstSession.activeExecutionId).toBe('execution-1');
		expect(secondSession.activeExecutionId).toBe('execution-2');
	});

	it('tracks the active execution id state machine', () => {
		const session = useWorkflowExecutionSessionStore('wf-1');

		expect(session.activeExecutionId).toBeUndefined();
		expect(session.previousExecutionId).toBeUndefined();
		expect(session.isWorkflowRunning).toBe(false);

		session.setActiveExecutionId('execution-1');
		expect(session.activeExecutionId).toBe('execution-1');
		expect(session.previousExecutionId).toBeUndefined();

		session.setActiveExecutionId('execution-2');
		expect(session.activeExecutionId).toBe('execution-2');
		expect(session.previousExecutionId).toBe('execution-1');

		session.setActiveExecutionId(null);
		expect(session.activeExecutionId).toBeNull();
		expect(session.previousExecutionId).toBe('execution-1');
		expect(session.isWorkflowRunning).toBe(true);

		session.setActiveExecutionId(undefined);
		expect(session.activeExecutionId).toBeUndefined();
		expect(session.isWorkflowRunning).toBe(false);
	});

	it('derives running state and trigger node from active execution data', () => {
		const workflowsStore = useWorkflowsStore();
		workflowsStore.workflow.nodes = [createNode({ name: 'Form', type: FORM_TRIGGER_NODE_TYPE })];
		const session = useWorkflowExecutionSessionStore('wf-1');
		useExecutionDataStore('execution-1').setExecution(
			createTestWorkflowExecutionResponse({
				id: 'execution-1',
				finished: false,
				status: 'running',
				triggerNode: 'Form',
				data: createRunExecutionData({ resultData: { runData: { Form: [] } } }),
			}),
		);

		session.setActiveExecutionId('execution-1');

		expect(session.isWorkflowRunning).toBe(true);
		expect(session.executionTriggerNodeName).toBe('Form');
	});

	it('stores current workflow execution summaries and last successful execution id', () => {
		const session = useWorkflowExecutionSessionStore('wf-1');
		const finished = createExecutionSummary({ id: 'finished', finished: true });
		const otherWorkflow = createExecutionSummary({ id: 'other', workflowId: 'wf-2' });

		session.addToCurrentExecutions([finished, otherWorkflow]);
		session.setLastSuccessfulExecution(
			createTestWorkflowExecutionResponse({ id: 'last-successful', status: 'success' }),
		);

		expect(session.currentWorkflowExecutions).toEqual([finished]);
		expect(session.getAllLoadedFinishedExecutions).toEqual([finished]);
		expect(session.lastSuccessfulExecutionId).toBe('last-successful');
		expect(useExecutionDataStore('last-successful').execution?.id).toBe('last-successful');
	});
});
