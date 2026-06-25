/**
 * Queue for SQLite Operations
 *
 * Serializes write operations to prevent concurrent writes from interleaving.
 * Read operations (SELECT) do not need queueing as SQLite WASM
 * supports unlimited concurrent reads.
 */

/**
 * SQL keywords that indicate a write operation
 */
const WRITE_KEYWORDS = [
	'INSERT',
	'UPDATE',
	'DELETE',
	'CREATE',
	'DROP',
	'ALTER',
	'REPLACE',
	// SQLite-specific write operations
	'VACUUM',
	'REINDEX',
	'ANALYZE',
	// Transaction control
	'BEGIN',
	'COMMIT',
	'ROLLBACK',
	'SAVEPOINT',
	'RELEASE',
];

/**
 * Check if a SQL statement is a write operation by examining the first keyword.
 * Special handling for PRAGMA: only PRAGMA statements with '=' are writes.
 */
export function isWriteOperation(sql: string): boolean {
	const trimmed = sql.trimStart().toUpperCase();

	// Special handling for PRAGMA: only write if it contains '=' (setting a value)
	if (trimmed.startsWith('PRAGMA')) {
		return sql.includes('=');
	}

	return WRITE_KEYWORDS.some((keyword) => trimmed.startsWith(keyword));
}

/**
 * A queued write request with its resolver functions
 */
interface QueuedRequest<T> {
	operation: () => Promise<T>;
	resolve: (value: T) => void;
	reject: (error: unknown) => void;
}

/**
 * Creates a serial queue that processes write operations one at a time
 */
export function createQueue() {
	const pending: Array<QueuedRequest<unknown>> = [];
	let processing = false;

	/**
	 * Process the next request in the queue
	 */
	async function processNext(): Promise<void> {
		if (processing || pending.length === 0) {
			return;
		}

		processing = true;
		const request = pending.shift();
		if (!request) {
			processing = false;
			return;
		}

		try {
			const result = await request.operation();
			request.resolve(result);
		} catch (error) {
			request.reject(error);
		} finally {
			processing = false;
			void processNext();
		}
	}

	/**
	 * Enqueue an operation. If options.sql is provided, it checks whether it's a write
	 * operation and queues accordingly. If sql is not provided (or is a write),
	 * the operation is queued. Read operations execute immediately without queueing.
	 *
	 * @param operation - The async operation to execute
	 * @param options - Optional configuration
	 * @param options.sql - SQL string to check if queueing is needed (default: null)
	 */
	async function enqueue<T>(
		operation: () => Promise<T>,
		options: { sql?: string | null } = {},
	): Promise<T> {
		const { sql = null } = options;

		// If sql is provided and it's a read operation, execute immediately
		if (sql !== null && !isWriteOperation(sql)) {
			return await operation();
		}

		// Queue write operations
		return await new Promise<T>((resolve, reject) => {
			pending.push({
				operation,
				resolve: resolve as (value: unknown) => void,
				reject,
			});
			void processNext();
		});
	}

	/**
	 * Get the current queue length (for debugging/monitoring)
	 */
	function getQueueLength(): number {
		return pending.length;
	}

	/**
	 * Check if the queue is currently processing
	 */
	function isProcessing(): boolean {
		return processing;
	}

	return {
		enqueue,
		getQueueLength,
		isProcessing,
	};
}

export type Queue = ReturnType<typeof createQueue>;
