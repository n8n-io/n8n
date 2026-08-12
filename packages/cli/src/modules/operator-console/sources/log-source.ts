import type {
	OperatorLogBatch,
	OperatorLogFilter,
	OperatorLogHost,
	OperatorLogReadResult,
} from '@n8n/api-types';

export type LogReadOptions = {
	/**
	 * Opaque cursor from a previous read. Omit to start from the oldest available
	 * record. Each implementation encodes its own position (ring buffer `seq`,
	 * Redis stream ID, file byte offset) — callers must never parse it.
	 */
	since?: string;
	filter: OperatorLogFilter;
	limit: number;
};

export type Unsubscribe = () => void;

/**
 * The single abstraction that makes deployment mode invisible. A single main
 * with no Redis, a queue-mode cluster, and replay from rotated log files all
 * satisfy this interface, so nothing above it — controller, UI, AI tool —
 * branches on how the instance is deployed.
 */
export interface LogSource {
	/** Historical read. Returns `gap: true` if the cursor was already evicted. */
	read(options: LogReadOptions): Promise<OperatorLogReadResult>;

	/**
	 * Live tail. The returned function must be safe to call more than once.
	 * Batching is the source's responsibility — never one callback per line.
	 */
	subscribe(filter: OperatorLogFilter, onBatch: (batch: OperatorLogBatch) => void): Unsubscribe;

	/** Hosts this source has seen recently, for the console's host picker. */
	hosts(): Promise<OperatorLogHost[]>;
}
