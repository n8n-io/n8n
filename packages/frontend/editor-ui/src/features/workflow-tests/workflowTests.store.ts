import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
	createWorkflowTestFromExecution,
	deleteWorkflowTest,
	fetchWorkflowTests,
	runWorkflowTest,
	type WorkflowTestRunResult,
	type WorkflowTestSummary,
} from '@/features/workflow-tests/workflowTests.api';

/**
 * PoC store for the per-workflow Tests tab: the list of saved tests plus the
 * latest run result for each. All mutating calls (create/run/delete) let
 * errors propagate — callers (the Tests view) are responsible for toasting.
 */
export const useWorkflowTestsStore = defineStore('workflowTests', () => {
	const rootStore = useRootStore();

	const testsByWorkflowId = ref<Record<string, WorkflowTestSummary[]>>({});
	const resultsByTestId = ref<Record<string, WorkflowTestRunResult>>({});
	const runningTestIds = ref<Set<string>>(new Set());

	const fetchTests = async (workflowId: string): Promise<void> => {
		const tests = await fetchWorkflowTests(rootStore.restApiContext, workflowId);
		testsByWorkflowId.value[workflowId] = tests;
	};

	const createFromExecution = async (
		executionId: string,
		name?: string,
	): Promise<WorkflowTestSummary> => {
		const test = await createWorkflowTestFromExecution(rootStore.restApiContext, executionId, name);
		const existing = testsByWorkflowId.value[test.workflowId] ?? [];
		testsByWorkflowId.value[test.workflowId] = [test, ...existing];
		return test;
	};

	const runTest = async (testId: string): Promise<WorkflowTestRunResult> => {
		runningTestIds.value.add(testId);
		try {
			const result = await runWorkflowTest(rootStore.restApiContext, testId);
			resultsByTestId.value[testId] = result;
			return result;
		} finally {
			runningTestIds.value.delete(testId);
		}
	};

	const deleteTest = async (testId: string, workflowId: string): Promise<void> => {
		await deleteWorkflowTest(rootStore.restApiContext, testId);
		testsByWorkflowId.value[workflowId] = (testsByWorkflowId.value[workflowId] ?? []).filter(
			(test) => test.id !== testId,
		);
		delete resultsByTestId.value[testId];
	};

	return {
		// Plain refs: exposed for direct reads (list rendering, status lookups). All
		// writes must go through the actions below so mutation stays in one place.
		testsByWorkflowId,
		resultsByTestId,
		runningTestIds,
		fetchTests,
		createFromExecution,
		runTest,
		deleteTest,
	};
});
