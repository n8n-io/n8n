export { useCRDTSync, simulateExecutionInWorker, clearExecutionsInWorker } from './useCRDTSync';
export type { CRDTSyncState, UseCRDTSyncOptions, UseCRDTSyncReturn } from './useCRDTSync';

// Document layer (raw workflow data)
export { useCrdtWorkflowDoc } from './useCrdtWorkflowDoc';
export { useRestWorkflowDoc } from './useRestWorkflowDoc';

// Inject helper
export { useWorkflowDoc, useWorkflowDocOptional } from './useWorkflowSync';

// Canvas adapter (Vue Flow bridge)
export { useCanvasSync } from './useCanvasSync';

// Awareness (presence, cursors, dragging)
export {
	useWorkflowAwareness,
	useWorkflowAwarenessInject,
	useWorkflowAwarenessOptional,
} from './useWorkflowAwareness';
export type { UseWorkflowAwarenessOptions } from './useWorkflowAwareness';
