import type { InjectionKey } from 'vue';
import type { WorkflowDocument } from './workflowDocument.types';

// Re-export document types for convenience
export type {
	WorkflowDocument,
	WorkflowNode,
	WorkflowEdge,
	NodePositionChange,
	NodeParamsChange,
} from './workflowDocument.types';

// Re-export awareness types
export type {
	AwarenessUser,
	AwarenessCursor,
	AwarenessSelection,
	AwarenessActivity,
	DraggingNode,
	WorkflowAwarenessState,
	Collaborator,
	UseWorkflowAwarenessReturn,
} from './awareness.types';
export { WorkflowAwarenessKey } from './awareness.types';

/**
 * Injection key for WorkflowDocument.
 * Provided by CrdtWorkflowProvider or RestWorkflowProvider.
 */
export const WorkflowDocumentKey: InjectionKey<WorkflowDocument> = Symbol('WorkflowDocument');
