import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useEvaluationsWizardSidepanelStore } from '../wizardSidepanel.store';
import { readFirstOutputItem } from './useSliceInputs';
import { useUserExecutions } from './useUserExecutions';
import { extractAnswerText } from '../evaluation.utils';

/**
 * Seed a NEW test case from a successful execution and open its detail:
 * inputs prefill via `seedExecution` (resolved by `useSliceInputs`), and the
 * expected answer prefills from the end node's output. Shared by the create-case
 * execution picker and the "create case from execution" action on the
 * executions page.
 */
export function useCreateCaseFromExecution() {
	const wizardStore = useEvaluationsWizardSidepanelStore();
	const executionsStore = useExecutionsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const telemetry = useTelemetry();
	const { fetchLatestUserExecution } = useUserExecutions();

	function createFromExecution(execution: IExecutionResponse): void {
		// Reset the form, then let useSliceInputs resolve inputs from this
		// execution (top priority once seedExecution is set).
		wizardStore.inputs = {};
		wizardStore.setPrefillInputsFromExecution(true);
		wizardStore.setSeedExecution(execution);

		// Prefill the expected answer from the end node's output.
		const endNode = wizardStore.answerNodeName;
		const runData = execution.data?.resultData?.runData;
		const answer =
			endNode && runData ? extractAnswerText(readFirstOutputItem(runData, endNode)) : '';
		wizardStore.expectedValues = answer ? { expectedAnswer: answer } : {};

		wizardStore.openDetail(null);

		telemetry.track('User created evaluation test case', {
			workflow_id: workflowDocumentStore.value?.workflowId ?? null,
			source: 'execution',
			execution_id: execution.id ?? null,
		});
	}

	async function createFromExecutionId(executionId: string): Promise<boolean> {
		const full = await executionsStore.fetchExecution(executionId);
		if (!full) return false;
		createFromExecution(full);
		return true;
	}

	/**
	 * Open a blank test case detail. The input field *shape* is still derived from
	 * the most recent real (non-evaluation) run — so it's correct for any trigger,
	 * not just chat — but the values (and expected output) start empty.
	 */
	async function createManualCase(): Promise<void> {
		wizardStore.inputs = {};
		wizardStore.expectedValues = {};
		// Keep values blank while still resolving field names from the execution.
		wizardStore.setPrefillInputsFromExecution(false);
		wizardStore.setSeedExecution(await resolveLastUserExecution());
		wizardStore.openDetail(null);

		telemetry.track('User created evaluation test case', {
			workflow_id: workflowDocumentStore.value?.workflowId ?? null,
			source: 'manual',
		});
	}

	/**
	 * The most recent successful, non-evaluation execution's full data, used to
	 * infer the input field shape. Null when the workflow has no such run.
	 */
	async function resolveLastUserExecution(): Promise<IExecutionResponse | null> {
		try {
			return await fetchLatestUserExecution();
		} catch {
			return null;
		}
	}

	return { createFromExecution, createFromExecutionId, createManualCase };
}
