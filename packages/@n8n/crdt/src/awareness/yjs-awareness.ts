import {
	Awareness as YProtocolAwareness,
	encodeAwarenessUpdate,
	applyAwarenessUpdate,
	removeAwarenessStates,
} from 'y-protocols/awareness';
import type * as Y from 'yjs';

import type {
	AwarenessChangeEvent,
	AwarenessClientId,
	AwarenessState,
	ChangeOrigin,
	CRDTAwareness,
	Unsubscribe,
} from '../types';
import { ChangeOrigin as ChangeOriginConst } from '../types';

type YjsChangeHandler = (
	changes: { added: number[]; updated: number[]; removed: number[] },
	origin: unknown,
) => void;

/**
 * Yjs implementation of CRDTAwareness.
 * Thin wrapper over y-protocols Awareness.
 */
export class YjsAwareness<T extends AwarenessState = AwarenessState> implements CRDTAwareness<T> {
	private readonly awareness: YProtocolAwareness;

	constructor(yDoc: Y.Doc) {
		this.awareness = new YProtocolAwareness(yDoc);
		// Yjs initializes with {} but our API expects null for uninitialized state
		this.awareness.setLocalState(null);
	}

	get clientId(): AwarenessClientId {
		return this.awareness.clientID;
	}

	getLocalState(): T | null {
		// y-protocols returns Record<string, any> | null, cast to generic T for type safety
		const state = this.awareness.getLocalState();
		if (state === null) return null;
		return state as T;
	}

	setLocalState(state: T | null): void {
		this.awareness.setLocalState(state);
	}

	setLocalStateField<K extends keyof T>(field: K, value: T[K]): void {
		this.awareness.setLocalStateField(field as string, value);
	}

	getStates(): Map<AwarenessClientId, T> {
		// y-protocols returns Map<number, Record<string, any>>, cast for type safety
		return this.awareness.getStates() as Map<AwarenessClientId, T>;
	}

	onChange(handler: (event: AwarenessChangeEvent, origin: ChangeOrigin) => void): Unsubscribe {
		const wrappedHandler: YjsChangeHandler = (changes, origin) => {
			handler(changes, origin === 'local' ? ChangeOriginConst.local : ChangeOriginConst.remote);
		};
		this.awareness.on('change', wrappedHandler);
		return () => this.awareness.off('change', wrappedHandler);
	}

	encodeState(clients?: AwarenessClientId[]): Uint8Array {
		const clientsToEncode = clients ?? Array.from(this.awareness.getStates().keys());
		return encodeAwarenessUpdate(this.awareness, clientsToEncode);
	}

	applyUpdate(update: Uint8Array): void {
		applyAwarenessUpdate(this.awareness, update, 'remote');
	}

	onUpdate(handler: (update: Uint8Array, origin: ChangeOrigin) => void): Unsubscribe {
		const wrappedHandler: YjsChangeHandler = (changes, origin) => {
			const changedClients = [...changes.added, ...changes.updated, ...changes.removed];
			if (changedClients.length === 0) return;
			const update = encodeAwarenessUpdate(this.awareness, changedClients);
			handler(update, origin === 'local' ? ChangeOriginConst.local : ChangeOriginConst.remote);
		};
		this.awareness.on('update', wrappedHandler);
		return () => this.awareness.off('update', wrappedHandler);
	}

	removeStates(clients: AwarenessClientId[]): void {
		const clientsToRemove = clients.filter((id) => id !== this.clientId);
		if (clientsToRemove.length > 0) {
			removeAwarenessStates(this.awareness, clientsToRemove, 'local');
		}
	}

	destroy(): void {
		this.awareness.setLocalState(null);
		this.awareness.destroy();
	}
}
