import { useWorkflowsStore } from '@/app/stores/workflows.store';

// --- Composable ---

// TODO: This composable currently delegates to workflowsStore.workflowObject for reads.
// The long-term goal is to remove workflowsStore entirely — workflowObject will become
// private state owned by workflowDocumentStore. Once that happens, the direct import
// (and the import-cycle warning it causes) will go away.
export function useWorkflowDocumentExpression() {
	const workflowsStore = useWorkflowsStore();

	// -----------------------------------------------------------------------
	// Expression resolution
	// -----------------------------------------------------------------------

	function getExpressionHandler() {
		return workflowsStore.workflowObject.expression;
	}

	return {
		getExpressionHandler,
	};
}
