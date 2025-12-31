import { AutomergeProvider } from './providers/automerge';
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
} from './types';

// Constants (also exports corresponding types via declaration merging)
export { ChangeAction, ChangeOrigin, CRDTEngine } from './types';

// Type guards
export { isMapChange, isArrayChange } from './types';

// Awareness implementations
export { YjsAwareness } from './awareness/yjs-awareness';
export { AutomergeAwareness } from './awareness/automerge-awareness';

// Providers
export { YjsProvider } from './providers/yjs';
export { AutomergeProvider } from './providers/automerge';

// Transports
export type { SyncTransport } from './transports';
export {
	MockTransport,
	MessagePortTransport,
	WebSocketTransport,
	BroadcastChannelTransport,
} from './transports';
export type { WebSocketTransportConfig } from './transports';

// Sync
export type { SyncProvider, CreateSyncProvider } from './sync';
export { BaseSyncProvider, createSyncProvider } from './sync';

// Protocol
export { MESSAGE_SYNC, MESSAGE_AWARENESS, encodeMessage, decodeMessage } from './protocol';

/**
 * Creates a CRDT provider based on the given configuration.
 * @param config - Configuration specifying which CRDT engine to use
 * @returns A CRDTProvider instance for the specified engine
 */
export function createCRDTProvider(config: CRDTConfig): CRDTProvider {
	switch (config.engine) {
		case CRDTEngine.yjs:
			return new YjsProvider();
		case CRDTEngine.automerge:
			return new AutomergeProvider();
		default: {
			const exhaustiveCheck: never = config.engine;
			throw new Error(`Unknown CRDT engine: ${String(exhaustiveCheck)}`);
		}
	}
}
