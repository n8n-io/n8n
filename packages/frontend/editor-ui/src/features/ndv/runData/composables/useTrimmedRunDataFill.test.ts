import { computed, effectScope, nextTick, ref, type EffectScope } from 'vue';
import type { MockInstance } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { ExecutionStatus, IRunData } from 'n8n-workflow';
import { createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import { TRIMMED_RUN_DATA_FILL_DELAY } from '@/app/constants';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useTrimmedRunDataFill } from './useTrimmedRunDataFill';

const documentId = createWorkflowDocumentId('wf-fill');

vi.mock('@/app/stores/workflowExecutionState.store', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/stores/workflowExecutionState.store')>();
	return {
		...actual,
		injectWorkflowExecutionStateStore: () =>
			computed(() => actual.useWorkflowExecutionStateStore(documentId)),
	};
});

const V2_ID = '019a3b2c-4d5e-7f60-8a1b-2c3d4e5f6a7b';
const V1_ID = '123';

const trimmedData = { main: [[{ json: { __isTrimmedManualExecutionDataItem: true } }]] };
const fullData = { main: [[{ json: { value: 1 } }]] };

function taskData(data: unknown) {
	return { executionIndex: 0, startTime: 1, executionTime: 1, source: [], data } as never;
}

function setUpExecution(
	executionId: string,
	runData: IRunData,
	status: ExecutionStatus = 'running',
) {
	useExecutionDataStore(createExecutionDataId(executionId)).setExecution(
		createTestWorkflowExecutionResponse({
			id: executionId,
			status,
			finished: false,
			data: { resultData: { runData } } as never,
		}),
	);
	useWorkflowExecutionStateStore(documentId).setActiveExecutionId(executionId);
}

function fetchedExecution(runData: IRunData) {
	return { data: { resultData: { runData } } } as IExecutionResponse;
}

describe('useTrimmedRunDataFill', () => {
	let fetchExecutionDataById: MockInstance<
		ReturnType<typeof useWorkflowsStore>['fetchExecutionDataById']
	>;
	let scopes: EffectScope[];

	function startFill(
		options: {
			nodeName?: string;
			runIndex?: number;
			isTrimmed?: boolean;
			hasWorkflowExecution?: boolean;
		} = {},
	) {
		const nodeName = ref(options.nodeName ?? 'NodeA');
		const runIndex = ref(options.runIndex ?? 0);
		const isTrimmed = ref(options.isTrimmed ?? true);
		const scope = effectScope();
		scope.run(() =>
			useTrimmedRunDataFill({
				nodeName,
				runIndex,
				isTrimmed,
				hasWorkflowExecution: () => options.hasWorkflowExecution ?? false,
			}),
		);
		scopes.push(scope);
		return { nodeName, runIndex, isTrimmed };
	}

	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
		scopes = [];
		fetchExecutionDataById = vi
			.spyOn(useWorkflowsStore(), 'fetchExecutionDataById')
			.mockImplementation(async () =>
				fetchedExecution({ NodeA: [taskData(fullData)], NodeB: [taskData(fullData)] }),
			);
	});

	afterEach(() => {
		scopes.forEach((scope) => scope.stop());
		vi.useRealTimers();
	});

	it('fetches once after the delay when the shown run is already trimmed', async () => {
		setUpExecution(V2_ID, { NodeA: [taskData(trimmedData)] });
		startFill();

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY - 1);
		expect(fetchExecutionDataById).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(fetchExecutionDataById).toHaveBeenCalledTimes(1);
		expect(fetchExecutionDataById).toHaveBeenCalledWith(V2_ID);

		const runData = useExecutionDataStore(createExecutionDataId(V2_ID)).execution?.data?.resultData
			.runData;
		expect(runData?.NodeA[0].data).toEqual(fullData);
	});

	it('restarts the delay and fetches for the new node after a switch to another trimmed node', async () => {
		setUpExecution(V2_ID, {
			NodeA: [taskData(trimmedData)],
			NodeB: [taskData(trimmedData)],
		});
		const { nodeName } = startFill();

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY - 1);
		nodeName.value = 'NodeB';
		await nextTick();

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY - 1);
		expect(fetchExecutionDataById).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(fetchExecutionDataById).toHaveBeenCalledTimes(1);

		const runData = useExecutionDataStore(createExecutionDataId(V2_ID)).execution?.data?.resultData
			.runData;
		expect(runData?.NodeB[0].data).toEqual(fullData);
		expect(runData?.NodeA[0].data).toEqual(trimmedData);
	});

	it('restarts the delay after a switch to another run index', async () => {
		setUpExecution(V2_ID, { NodeA: [taskData(trimmedData), taskData(trimmedData)] });
		const { runIndex } = startFill();

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY - 1);
		runIndex.value = 1;
		await nextTick();

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY - 1);
		expect(fetchExecutionDataById).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(fetchExecutionDataById).toHaveBeenCalledTimes(1);
	});

	it('fetches nothing when the data arrives before the delay ends', async () => {
		setUpExecution(V2_ID, { NodeA: [taskData(trimmedData)] });
		const { isTrimmed } = startFill();

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY / 2);
		isTrimmed.value = false;
		await nextTick();

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY * 2);
		expect(fetchExecutionDataById).not.toHaveBeenCalled();
	});

	it('fetches nothing for a numeric execution ID', async () => {
		setUpExecution(V1_ID, { NodeA: [taskData(trimmedData)] });
		startFill();

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY * 2);
		expect(fetchExecutionDataById).not.toHaveBeenCalled();
	});

	it('fetches nothing when the execution is in a terminal state', async () => {
		setUpExecution(V2_ID, { NodeA: [taskData(trimmedData)] }, 'success');
		startFill();

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY * 2);
		expect(fetchExecutionDataById).not.toHaveBeenCalled();
	});

	it('fetches nothing when the execution ends during the delay', async () => {
		setUpExecution(V2_ID, { NodeA: [taskData(trimmedData)] });
		startFill();

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY / 2);
		useWorkflowExecutionStateStore(documentId).setActiveExecutionId(undefined);

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY);
		expect(fetchExecutionDataById).not.toHaveBeenCalled();
	});

	it('fetches nothing when the execution reaches a terminal state during the delay', async () => {
		setUpExecution(V2_ID, { NodeA: [taskData(trimmedData)] });
		startFill();

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY / 2);
		setUpExecution(V2_ID, { NodeA: [taskData(trimmedData)] }, 'success');

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY);
		expect(fetchExecutionDataById).not.toHaveBeenCalled();
	});

	it('fetches nothing for a panel with a workflowExecution prop', async () => {
		setUpExecution(V2_ID, { NodeA: [taskData(trimmedData)] });
		startFill({ hasWorkflowExecution: true });

		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY * 2);
		expect(fetchExecutionDataById).not.toHaveBeenCalled();
	});

	it('sends no second request while a request for the same execution and node is in flight', async () => {
		setUpExecution(V2_ID, { NodeA: [taskData(trimmedData)] });
		let resolveFetch: (execution: IExecutionResponse) => void = () => {};
		fetchExecutionDataById.mockImplementation(
			async () => await new Promise<IExecutionResponse>((resolve) => (resolveFetch = resolve)),
		);

		startFill();
		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY);
		expect(fetchExecutionDataById).toHaveBeenCalledTimes(1);

		// A second panel on the same node.
		startFill();
		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY);
		expect(fetchExecutionDataById).toHaveBeenCalledTimes(1);

		resolveFetch(fetchedExecution({ NodeA: [taskData(fullData)] }));
		await vi.advanceTimersByTimeAsync(0);
	});

	it('does not throw and leaves the store unchanged when the request fails', async () => {
		setUpExecution(V2_ID, { NodeA: [taskData(trimmedData)] });
		fetchExecutionDataById.mockRejectedValue(new Error('Request failed'));

		startFill();
		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY);

		expect(fetchExecutionDataById).toHaveBeenCalledTimes(1);
		const runData = useExecutionDataStore(createExecutionDataId(V2_ID)).execution?.data?.resultData
			.runData;
		expect(runData?.NodeA[0].data).toEqual(trimmedData);
	});

	it('cancels the delay when the scope stops', async () => {
		setUpExecution(V2_ID, { NodeA: [taskData(trimmedData)] });
		startFill();

		scopes[0].stop();
		await vi.advanceTimersByTimeAsync(TRIMMED_RUN_DATA_FILL_DELAY * 2);
		expect(fetchExecutionDataById).not.toHaveBeenCalled();
	});
});
