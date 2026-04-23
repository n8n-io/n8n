import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { WorkflowExpression } from 'n8n-workflow';

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

	function getExpressionHandler(): WorkflowExpression {
		return workflowsStore.workflowObject.expression as WorkflowExpression;
	}

	return {
		getExpressionHandler,
	};
}
