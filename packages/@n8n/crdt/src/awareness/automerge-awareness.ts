import type {
	AwarenessChangeEvent,
	AwarenessClientId,
	AwarenessState,
	ChangeOrigin,
	CRDTAwareness,
	Unsubscribe,
} from '../types';
import { ChangeOrigin as ChangeOriginConst } from '../types';

/**
 * Internal state structure for each client in awareness.
 * Includes a clock for last-write-wins conflict resolution.
 */
interface AwarenessClientState<T> {
	clock: number;
	state: T | null;
	lastUpdated: number;
}

/**
 * Binary encoding format for awareness updates.
 * Uses a simple JSON-based format for cross-platform compatibility.
 *
 * Format: [version, ...entries]
 * Entry: [clientId, clock, state]
 */
const ENCODING_VERSION = 1;

/**
 * Default timeout for marking remote clients as offline (30 seconds).
 * Matches Yjs awareness behavior.
 */
const OFFLINE_TIMEOUT_MS = 30000;

/**
 * Automerge implementation of CRDTAwareness.
 * Implements the same protocol as Yjs awareness for compatibility.
 *
 * Since Automerge doesn't have built-in awareness, this is a custom
 * implementation that follows the same semantics:
 * - Each client has a clock that increments on state changes
 * - Higher clock values win in conflicts
 * - Clients are marked offline after 30s without updates
 * - null state means the client is offline
 */
export class AutomergeAwareness<T extends AwarenessState = AwarenessState>
	implements CRDTAwareness<T>
{
	readonly clientId: AwarenessClientId;
	private states = new Map<AwarenessClientId, AwarenessClientState<T>>();
	private localClock = 0;
	private readonly changeHandlers = new Set<
		(event: AwarenessChangeEvent, origin: ChangeOrigin) => void
	>();
	private readonly updateHandlers = new Set<(update: Uint8Array, origin: ChangeOrigin) => void>();
	private timeoutCheckInterval: ReturnType<typeof setInterval> | null = null;
	private destroyed = false;

	constructor(docId: string) {
		// Generate a unique client ID based on document ID and random value
		// This ensures each tab/connection gets a unique ID
		this.clientId = this.generateClientId(docId);

		// Initialize local state as null (not yet set)
		this.states.set(this.clientId, {
			clock: 0,
			state: null,
			lastUpdated: Date.now(),
		});

		// Start the offline check interval
		this.startTimeoutCheck();
	}

	private generateClientId(docId: string): AwarenessClientId {
		// Generate a random 32-bit integer for client ID
		// This matches Yjs's clientID generation approach
		const buffer = new Uint32Array(1);
		if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
			crypto.getRandomValues(buffer);
		} else {
			// Fallback for environments without crypto
			buffer[0] = Math.floor(Math.random() * 0xffffffff);
		}
		// Mix in hash of docId for better distribution
		const docHash = this.hashString(docId);
		return (buffer[0] ^ docHash) >>> 0;
	}

	private hashString(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash + char) | 0;
		}
		return hash >>> 0;
	}

	private startTimeoutCheck(): void {
		// Check for timed-out clients every 5 seconds
		this.timeoutCheckInterval = setInterval(() => {
			this.checkTimeouts();
		}, 5000);
	}

	private checkTimeouts(): void {
		const now = Date.now();
		const removed: AwarenessClientId[] = [];

		for (const [clientId, clientState] of this.states) {
			// Don't timeout our own state
			if (clientId === this.clientId) continue;

			// Check if client has timed out
			if (now - clientState.lastUpdated > OFFLINE_TIMEOUT_MS) {
				this.states.delete(clientId);
				removed.push(clientId);
			}
		}

		if (removed.length > 0) {
			this.notifyChange({ added: [], updated: [], removed }, ChangeOriginConst.local);
		}
	}

	getLocalState(): T | null {
		const clientState = this.states.get(this.clientId);
		return clientState?.state ?? null;
	}

	setLocalState(state: T | null): void {
		this.localClock++;
		this.states.set(this.clientId, {
			clock: this.localClock,
			state,
			lastUpdated: Date.now(),
		});

		const event: AwarenessChangeEvent = {
			added: [],
			updated: [this.clientId],
			removed: [],
		};

		// If setting to null, it's a removal
		if (state === null) {
			event.updated = [];
			event.removed = [this.clientId];
		}

		this.notifyChange(event, ChangeOriginConst.local);
		this.notifyUpdate(ChangeOriginConst.local);
	}

	setLocalStateField<K extends keyof T>(field: K, value: T[K]): void {
		const currentState = this.getLocalState();
		if (currentState === null) return;

		this.setLocalState({
			...currentState,
			[field]: value,
		});
	}

	getStates(): Map<AwarenessClientId, T> {
		const result = new Map<AwarenessClientId, T>();
		for (const [clientId, clientState] of this.states) {
			if (clientState.state !== null) {
				result.set(clientId, clientState.state);
			}
		}
		return result;
	}

	onChange(handler: (event: AwarenessChangeEvent, origin: ChangeOrigin) => void): Unsubscribe {
		this.changeHandlers.add(handler);
		return () => {
			this.changeHandlers.delete(handler);
		};
	}

	encodeState(clients?: AwarenessClientId[]): Uint8Array {
		const clientsToEncode = clients ?? Array.from(this.states.keys());
		const entries: Array<[AwarenessClientId, number, T | null]> = [];

		for (const clientId of clientsToEncode) {
			const clientState = this.states.get(clientId);
			if (clientState) {
				entries.push([clientId, clientState.clock, clientState.state]);
			}
		}

		const data = [ENCODING_VERSION, ...entries];
		const json = JSON.stringify(data);
		return new TextEncoder().encode(json);
	}

	applyUpdate(update: Uint8Array): void {
		try {
			const json = new TextDecoder().decode(update);
			const data = JSON.parse(json) as [number, ...Array<[AwarenessClientId, number, T | null]>];

			const version = data[0];
			if (version !== ENCODING_VERSION) {
				console.warn(`Unknown awareness encoding version: ${version}`);
				return;
			}

			const added: AwarenessClientId[] = [];
			const updated: AwarenessClientId[] = [];
			const removed: AwarenessClientId[] = [];

			for (let i = 1; i < data.length; i++) {
				const [clientId, clock, state] = data[i] as [AwarenessClientId, number, T | null];

				// Don't apply updates for our own state
				if (clientId === this.clientId) continue;

				const existing = this.states.get(clientId);

				// Only apply if clock is newer
				if (!existing || clock > existing.clock) {
					const isNew = existing?.state === null || existing?.state === undefined;

					if (state === null) {
						// Client went offline
						if (existing && existing.state !== null) {
							removed.push(clientId);
						}
						this.states.set(clientId, {
							clock,
							state: null,
							lastUpdated: Date.now(),
						});
					} else {
						// Client state updated
						if (isNew) {
							added.push(clientId);
						} else {
							updated.push(clientId);
						}
						this.states.set(clientId, {
							clock,
							state,
							lastUpdated: Date.now(),
						});
					}
				}
			}

			if (added.length > 0 || updated.length > 0 || removed.length > 0) {
				this.notifyChange({ added, updated, removed }, ChangeOriginConst.remote);
			}
		} catch (error) {
			console.error('Failed to apply awareness update:', error);
		}
	}

	onUpdate(handler: (update: Uint8Array, origin: ChangeOrigin) => void): Unsubscribe {
		this.updateHandlers.add(handler);
		return () => {
			this.updateHandlers.delete(handler);
		};
	}

	removeStates(clients: AwarenessClientId[]): void {
		const removed: AwarenessClientId[] = [];

		for (const clientId of clients) {
			// Don't remove our own state
			if (clientId === this.clientId) continue;

			const existing = this.states.get(clientId);
			if (existing && existing.state !== null) {
				removed.push(clientId);
				this.states.delete(clientId);
			}
		}

		if (removed.length > 0) {
			this.notifyChange({ added: [], updated: [], removed }, ChangeOriginConst.local);
		}
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;

		// Stop the timeout check
		if (this.timeoutCheckInterval) {
			clearInterval(this.timeoutCheckInterval);
			this.timeoutCheckInterval = null;
		}

		// Mark this client as offline
		this.setLocalState(null);

		// Clear handlers
		this.changeHandlers.clear();
		this.updateHandlers.clear();

		// Clear states
		this.states.clear();
	}

	private notifyChange(event: AwarenessChangeEvent, origin: ChangeOrigin): void {
		if (this.destroyed) return;

		for (const handler of this.changeHandlers) {
			handler(event, origin);
		}
	}

	private notifyUpdate(origin: ChangeOrigin): void {
		if (this.destroyed) return;
		if (this.updateHandlers.size === 0) return;

		// Encode just our own state for updates
		const update = this.encodeState([this.clientId]);

		for (const handler of this.updateHandlers) {
			handler(update, origin);
		}
	}
}
