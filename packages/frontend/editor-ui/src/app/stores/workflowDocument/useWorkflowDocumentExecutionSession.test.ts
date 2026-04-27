import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { computed, ref } from 'vue';
import { createRunExecutionData, type ExecutionSummary } from 'n8n-workflow';
import { FORM_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE } from '@/app/constants';
import { createTestNode, createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import { useExecutionDataStore } from '@/app/stores/executionData.store';
import { useWorkflowDocumentExecutionSession } from './useWorkflowDocumentExecutionSession';

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

describe('useWorkflowDocumentExecutionSession', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('tracks the active execution id state machine', () => {
		const triggerNodes = ref<INodeUi[]>([]);
		const session = useWorkflowDocumentExecutionSession({
			workflowId: 'wf-1',
			workflowTriggerNodes: computed(() => triggerNodes.value),
			getNodeType: () => null,
		});

		expect(session.activeExecutionId.value).toBeUndefined();
		expect(session.previousExecutionId.value).toBeUndefined();
		expect(session.isWorkflowRunning.value).toBe(false);

		session.setActiveExecutionId('execution-1');
		expect(session.activeExecutionId.value).toBe('execution-1');
		expect(session.previousExecutionId.value).toBeUndefined();

		session.setActiveExecutionId('execution-2');
		expect(session.activeExecutionId.value).toBe('execution-2');
		expect(session.previousExecutionId.value).toBe('execution-1');

		session.setActiveExecutionId(null);
		expect(session.activeExecutionId.value).toBeNull();
		expect(session.previousExecutionId.value).toBe('execution-1');
		expect(session.isWorkflowRunning.value).toBe(true);

		session.setActiveExecutionId(undefined);
		expect(session.activeExecutionId.value).toBeUndefined();
		expect(session.isWorkflowRunning.value).toBe(false);
	});

	it('derives running state and trigger node from active execution data', () => {
		const triggerNodes = ref<INodeUi[]>([
			createNode({ name: 'Form', type: FORM_TRIGGER_NODE_TYPE }),
		]);
		const session = useWorkflowDocumentExecutionSession({
			workflowId: 'wf-1',
			workflowTriggerNodes: computed(() => triggerNodes.value),
			getNodeType: () => null,
		});
		useExecutionDataStore('execution-1').setExecution(
			createTestWorkflowExecutionResponse({
				id: 'execution-1',
				finished: false,
				status: 'running',
				data: createRunExecutionData({ resultData: { runData: { Form: [] } } }),
			}),
		);

		session.setActiveExecutionId('execution-1');

		expect(session.isWorkflowRunning.value).toBe(true);
		expect(session.executionTriggerNodeName.value).toBe('Form');
	});

	it('stores current workflow execution summaries and last successful execution id', () => {
		const session = useWorkflowDocumentExecutionSession({
			workflowId: 'wf-1',
			workflowTriggerNodes: computed(() => []),
			getNodeType: () => null,
		});
		const finished = createExecutionSummary({ id: 'finished', finished: true });
		const otherWorkflow = createExecutionSummary({ id: 'other', workflowId: 'wf-2' });

		session.addToCurrentExecutions([finished, otherWorkflow]);
		session.setLastSuccessfulExecution(
			createTestWorkflowExecutionResponse({ id: 'last-successful', status: 'success' }),
		);

		expect(session.currentWorkflowExecutions.value).toEqual([finished]);
		expect(session.getAllLoadedFinishedExecutions.value).toEqual([finished]);
		expect(session.lastSuccessfulExecutionId.value).toBe('last-successful');
		expect(useExecutionDataStore('last-successful').execution?.id).toBe('last-successful');
	});
});
