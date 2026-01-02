/**
 * Browser-safe exports that don't include Automerge (which requires WASM).
 *
 * Use this entry point in frontend code:
 * import { createCRDTProvider, CRDTEngine, ... } from '@n8n/crdt/browser';
 */

import { YjsProvider } from './providers/yjs';
import { CRDTEngine } from './types';
import type { CRDTConfig, CRDTProvider } from './types';

// Types (same as main)
export type {
	Unsubscribe,
	ArrayDelta,
	ArrayChangeEvent,
	DeepChangeEvent,
	DeepChange,
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

// Constants
export { ChangeAction, ChangeOrigin, CRDTEngine } from './types';

// Type guards
export { isMapChange, isArrayChange } from './types';

// Yjs Provider only (no Automerge)
export { YjsProvider } from './providers/yjs';

// Yjs Awareness only (no Automerge)
export { YjsAwareness } from './awareness/yjs-awareness';

// Transports
export type { SyncTransport } from './transports';
export {
	MockTransport,
	MessagePortTransport,
	WebSocketTransport,
	BroadcastChannelTransport,
	WorkerTransport,
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
	stripDocId,
	addDocId,
	encodeString,
	decodeString,
} from './protocol';

/**
 * Creates a CRDT provider for browser environments (Yjs only).
 * @param config - Configuration specifying which CRDT engine to use
 * @returns A CRDTProvider instance (only Yjs is supported in browser)
 */
export function createCRDTProvider(config: CRDTConfig): CRDTProvider {
	if (config.engine !== CRDTEngine.yjs) {
		throw new Error(
			`Engine "${config.engine}" is not supported in browser. Use CRDTEngine.yjs or import from '@n8n/crdt' for full support.`,
		);
	}
	return new YjsProvider();
}
