export { useCRDTSync, simulateExecutionInWorker, clearExecutionsInWorker } from './useCRDTSync';
export type { CRDTSyncState, UseCRDTSyncOptions, UseCRDTSyncReturn } from './useCRDTSync';

// Document layer (raw workflow data)
export { useCrdtWorkflowDoc } from './useCrdtWorkflowDoc';
export { useRestWorkflowDoc } from './useRestWorkflowDoc';

// Inject helper
export { useWorkflowDoc, useWorkflowDocOptional } from './useWorkflowSync';

// Reactive node access
export { useNodeReactive } from './useNodeReactive';

// Canvas adapter (Vue Flow bridge)
export { useCanvasSync } from './useCanvasSync';

// Awareness (presence, cursors, dragging)
export {
	useWorkflowAwareness,
	useWorkflowAwarenessInject,
	useWorkflowAwarenessOptional,
} from './useWorkflowAwareness';
export type { UseWorkflowAwarenessOptions } from './useWorkflowAwareness';

// CRDT-backed WorkflowState for parameter editing
export { useCrdtWorkflowState } from './useCrdtWorkflowState';
