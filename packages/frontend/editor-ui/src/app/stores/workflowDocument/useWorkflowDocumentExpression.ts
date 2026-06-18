import type { Ref } from 'vue';
import type { Workflow, WorkflowExpression } from 'n8n-workflow';

// --- Composable ---

export function useWorkflowDocumentExpression(workflowObject: Readonly<Ref<Workflow>>) {
	// -----------------------------------------------------------------------
	// Expression resolution
	// -----------------------------------------------------------------------

	function getExpressionHandler(): WorkflowExpression {
		return workflowObject.value.expression as WorkflowExpression;
	}

	return {
		getExpressionHandler,
	};
}
