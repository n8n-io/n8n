/**
 * Coordinator Types
 *
 * This module defines types used by the coordinator SharedWorker.
 * These types are specific to the coordination layer that manages
 * which tab's dedicated worker is active.
 */

import type * as Comlink from 'comlink';
import type { DataWorkerApi } from '../data/worker';

/**
 * Represents a connected tab in the coordinator
 */
export interface TabConnection {
	id: string;
	port: MessagePort;
	dataWorker: Comlink.Remote<DataWorkerApi> | null;
	isActive: boolean;
}

/**
 * State of the coordinator SharedWorker
 */
export interface CoordinatorState {
	tabs: Map<string, TabConnection>;
	activeTabId: string | null;
	initialized: boolean;
}

/**
 * Information about the coordinator state (for debugging)
 */
export interface CoordinatorInfo {
	activeTabId: string | null;
	tabCount: number;
	isInitialized: boolean;
}

/**
 * Message types for worker communication
 */
export type WorkerMessageType = 'connect' | 'disconnect' | 'query' | 'exec' | 'result' | 'error';

export interface WorkerMessage {
	type: WorkerMessageType;
	payload?: unknown;
	port?: MessagePort;
}
