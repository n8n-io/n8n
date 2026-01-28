import { inject } from 'vue';
import { WorkflowDocumentKey, type WorkflowDocument } from '../types/workflowSync.types';

/**
 * Inject the workflow document from a parent provider.
 *
 * Must be called within a component tree that has a workflow provider
 * (e.g., CrdtWorkflowProvider, RestWorkflowProvider) as an ancestor.
 *
 * @example
 * ```ts
 * const doc = useWorkflowDoc();
 *
 * // Read nodes
 * const nodes = doc.getNodes();
 *
 * // Add node
 * doc.addNode({ id: '1', position: [0, 0], name: 'Node', type: 'unknown', parameters: {} });
 *
 * // Update position
 * doc.updateNodePosition('1', [100, 100]);
 * ```
 *
 * @throws Error if called outside of a workflow provider
 */
export function useWorkflowDoc(): WorkflowDocument {
	const doc = inject(WorkflowDocumentKey);
	if (!doc) {
		throw new Error(
			'useWorkflowDoc must be used within a workflow provider (e.g., CrdtWorkflowProvider)',
		);
	}
	return doc;
}

/**
 * Try to inject workflow document, returns undefined if not available.
 * Useful for components that may or may not be within a provider.
 */
export function useWorkflowDocOptional(): WorkflowDocument | undefined {
	return inject(WorkflowDocumentKey);
}
