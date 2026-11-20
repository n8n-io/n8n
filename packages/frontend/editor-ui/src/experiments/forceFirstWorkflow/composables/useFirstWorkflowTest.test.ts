import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';

import { useFirstWorkflowTest } from './useFirstWorkflowTest';

const runEntireWorkflow = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/useRunWorkflow', () => ({
	useRunWorkflow: () => ({ runEntireWorkflow }),
}));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({}),
}));

const WORKFLOW_ID = 'wf-1';

let harness: ReturnType<typeof useFirstWorkflowTest>;
let onFinished: ReturnType<typeof vi.fn>;

const Harness = defineComponent({
	setup() {
		harness = useFirstWorkflowTest(onFinished);
		return () => h('div');
	},
});

const renderHarness = createComponentRenderer(Harness, {
	global: {
		provide: { [WorkflowDocumentStoreKey as symbol]: ref({ workflowId: WORKFLOW_ID }) },
	},
});

function setup() {
	renderHarness({ pinia: createTestingPinia({ stubActions: false }) });
	return useWorkflowExecutionStateStore(createWorkflowDocumentId(WORKFLOW_ID));
}

describe('useFirstWorkflowTest', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		onFinished = vi.fn();
		runEntireWorkflow.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('reports success when a run finishes without node errors', async () => {
		const executionState = setup();
		runEntireWorkflow.mockImplementation(async () => {
			executionState.setActiveExecutionId(null);
			executionState.setActiveExecutionId('exec-1');
		});

		const run = harness.test();
		await flushPromises();
		expect(harness.status.value).toBe('running');

		executionState.setActiveExecutionId(undefined);
		await flushPromises();
		await vi.runAllTimersAsync();
		await run;

		expect(harness.status.value).toBe('success');
		expect(onFinished).toHaveBeenCalledWith(true, undefined);
	});

	it('reports the node error of a failed run', async () => {
		const executionState = setup();
		runEntireWorkflow.mockImplementation(async () => {
			executionState.setActiveExecutionId('exec-1');
		});
		useExecutionDataStore(createExecutionDataId('exec-1')).setExecution({
			id: 'exec-1',
			data: {
				resultData: {
					runData: {
						'Get unread emails': [
							{ error: { message: 'Authorization failed' }, executionStatus: 'error' },
						],
					},
				},
			},
		} as never);

		const run = harness.test();
		await flushPromises();
		executionState.setActiveExecutionId(undefined);
		await flushPromises();
		await vi.runAllTimersAsync();
		await run;

		expect(harness.status.value).toBe('error');
		expect(harness.errorMessage.value).toBe('Authorization failed');
		expect(onFinished).toHaveBeenCalledWith(false, 'Authorization failed');
	});

	it('ends as an error when the run stops before it starts', async () => {
		const executionState = setup();
		runEntireWorkflow.mockImplementation(async () => {
			executionState.setActiveExecutionId(null);
		});

		const run = harness.test();
		await flushPromises();
		expect(harness.status.value).toBe('running');

		// A run that fails validation clears its pending id without ever getting an execution.
		executionState.setActiveExecutionId(undefined);
		await flushPromises();
		await vi.runAllTimersAsync();
		await run;

		expect(harness.status.value).toBe('error');
		expect(onFinished).toHaveBeenCalledWith(false, undefined);
	});

	it('ends as an error when the run never starts', async () => {
		setup();
		runEntireWorkflow.mockResolvedValue(undefined);

		const run = harness.test();
		await vi.runAllTimersAsync();
		await run;

		expect(harness.status.value).toBe('error');
		expect(onFinished).toHaveBeenCalledTimes(1);
	});
});
