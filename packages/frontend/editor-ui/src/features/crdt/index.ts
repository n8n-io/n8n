// CRDT Feature
// Provides CRDT-based real-time collaboration infrastructure

// Composables
export {
	useCRDTSync,
	simulateExecutionInWorker,
	clearExecutionsInWorker,
	type CRDTSyncState,
	type UseCRDTSyncOptions,
	type UseCRDTSyncReturn,
	// Document layer
	useCrdtWorkflowDoc,
	useRestWorkflowDoc,
	// Inject helper
	useWorkflowDoc,
	useWorkflowDocOptional,
	// Canvas adapter
	useCanvasSync,
} from './composables';

// Types
export {
	WorkflowDocumentKey,
	type WorkflowDocument,
	type WorkflowNode,
	type WorkflowEdge,
	type NodePositionChange,
	type NodeParamsChange,
} from './types/workflowSync.types';

// Components
export { default as CrdtWorkflowProvider } from './components/CrdtWorkflowProvider.vue';
export { default as RestWorkflowProvider } from './components/RestWorkflowProvider.vue';

// Views are imported directly in the router via dynamic import
// Workers are loaded via URL import in the composables
