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
} from './composables';

// Views are imported directly in the router via dynamic import
// Workers are loaded via URL import in the composables
