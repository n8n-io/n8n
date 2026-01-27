import type { SyncTransport } from '../transports';
import type { CRDTDoc, Unsubscribe } from '../types';
import type { SyncProvider } from './types';

type SyncStateHandler = (syncing: boolean) => void;
type ErrorHandler = (error: Error) => void;

/**
 * BaseSyncProvider - Engine-agnostic sync provider implementation.
 *
 * Works with any CRDTDoc since it only uses the standard sync methods:
 * - encodeState() for initial sync
 * - applyUpdate() for incoming updates
 * - onUpdate() for outgoing updates
 */
export class BaseSyncProvider implements SyncProvider {
	private _syncing = false;
	private stateHandlers = new Set<SyncStateHandler>();
	private errorHandlers = new Set<ErrorHandler>();
	private unsubscribeDoc: Unsubscribe | null = null;
	private unsubscribeTransport: Unsubscribe | null = null;

	constructor(
		readonly doc: CRDTDoc,
		readonly transport: SyncTransport,
	) {}

	get syncing(): boolean {
		return this._syncing;
	}

	async start(): Promise<void> {
		if (this._syncing) return;

		// Connect transport
		await this.transport.connect();

		// Subscribe to incoming updates from transport
		this.unsubscribeTransport = this.transport.onReceive((data) => {
			try {
				this.doc.applyUpdate(data);
			} catch (error) {
				this.notifyError(error instanceof Error ? error : new Error(String(error)));
			}
		});

		// Subscribe to outgoing updates from doc
		this.unsubscribeDoc = this.doc.onUpdate((update) => {
			if (this.transport.connected) {
				this.transport.send(update);
			}
		});

		// Send initial state to peer
		const initialState = this.doc.encodeState();
		this.transport.send(initialState);

		this._syncing = true;
		this.notifyStateChange();
	}

	stop(): void {
		if (!this._syncing) return;

		// Unsubscribe from doc updates
		if (this.unsubscribeDoc) {
			this.unsubscribeDoc();
			this.unsubscribeDoc = null;
		}

		// Unsubscribe from transport
		if (this.unsubscribeTransport) {
			this.unsubscribeTransport();
			this.unsubscribeTransport = null;
		}

		// Disconnect transport
		this.transport.disconnect();

		this._syncing = false;
		this.notifyStateChange();
	}

	onSyncStateChange(handler: SyncStateHandler): Unsubscribe {
		this.stateHandlers.add(handler);
		return () => {
			this.stateHandlers.delete(handler);
		};
	}

	onError(handler: ErrorHandler): Unsubscribe {
		this.errorHandlers.add(handler);
		return () => {
			this.errorHandlers.delete(handler);
		};
	}

	private notifyStateChange(): void {
		for (const handler of this.stateHandlers) {
			handler(this._syncing);
		}
	}

	private notifyError(error: Error): void {
		for (const handler of this.errorHandlers) {
			handler(error);
		}
	}
}

/**
 * Create a sync provider for any CRDTDoc.
 */
export function createSyncProvider(doc: CRDTDoc, transport: SyncTransport): SyncProvider {
	return new BaseSyncProvider(doc, transport);
}
