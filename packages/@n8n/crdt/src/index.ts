import { YjsProvider } from './providers/yjs';
import { CRDTEngine } from './types';
import type { CRDTConfig, CRDTProvider } from './types';

// Types
export type {
	Unsubscribe,
	ArrayDelta,
	ArrayChangeEvent,
	DeepChangeEvent,
	DeepChange,
	TransactionBatch,
	CRDTArray,
	CRDTMap,
	CRDTDoc,
	CRDTProvider,
	CRDTConfig,
	// Awareness types
	AwarenessClientId,
	AwarenessState,
	AwarenessChangeEvent,
	CRDTAwareness,
	// Undo manager types
	UndoManagerOptions,
	UndoStackChangeEvent,
	CRDTUndoManager,
} from './types';

// Constants (also exports corresponding types via declaration merging)
export { ChangeAction, ChangeOrigin, CRDTEngine } from './types';

// Type guards
export { isMapChange, isArrayChange } from './types';

// Awareness implementations
export { YjsAwareness } from './awareness/yjs-awareness';

// Undo manager implementations
export { YjsUndoManager, YjsUndoManagerOrigin, YjsRemoteOrigin } from './undo/yjs-undo-manager';

// Providers
export { YjsProvider } from './providers/yjs';

// Transports
export type { SyncTransport } from './transports';
export {
	MockTransport,
	MessagePortTransport,
	WebSocketTransport,
	WorkerTransport,
	BroadcastChannelTransport,
} from './transports';
export type { WebSocketTransportConfig, WorkerTransportConfig } from './transports';

// Sync
export type { SyncProvider, CreateSyncProvider } from './sync';
export { BaseSyncProvider, createSyncProvider } from './sync';

// Protocol
export {
	MESSAGE_SYNC,
	MESSAGE_AWARENESS,
	MESSAGE_SUBSCRIBE,
	MESSAGE_UNSUBSCRIBE,
	MESSAGE_CONNECTED,
	MESSAGE_DISCONNECTED,
	MESSAGE_INITIAL_SYNC,
	encodeMessage,
	decodeMessage,
	encodeWithDocId,
	decodeWithDocId,
	encodeString,
	decodeString,
	stripDocId,
	addDocId,
} from './protocol';

// Utilities
export { seedValueDeep, toJSON, getNestedValue, setNestedValue } from './utils';

/**
 * Creates a CRDT provider based on the given configuration.
 * @param config - Configuration specifying which CRDT engine to use
 * @returns A CRDTProvider instance for the specified engine
 */
export function createCRDTProvider(config: CRDTConfig): CRDTProvider {
	switch (config.engine) {
		case CRDTEngine.yjs:
			return new YjsProvider();
		default: {
			const exhaustiveCheck: never = config.engine;
			throw new Error(`Unknown CRDT engine: ${String(exhaustiveCheck)}`);
		}
	}
}
