/**
 * Write Queue for SQLite Operations
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
 * Creates a serial write queue that processes write operations one at a time
 */
export function createWriteQueue() {
	const queue: Array<QueuedRequest<unknown>> = [];
	let processing = false;

	/**
	 * Process the next request in the queue
	 */
	async function processNext(): Promise<void> {
		if (processing || queue.length === 0) {
			return;
		}

		processing = true;
		const request = queue.shift();
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
	 * Enqueue an operation. If sql is provided, it checks whether it's a write
	 * operation and queues accordingly. If sql is not provided (or is a write),
	 * the operation is queued. Read operations execute immediately without queueing.
	 *
	 * @param sql - Optional SQL string to check if queueing is needed
	 * @param operation - The async operation to execute
	 */
	async function enqueue<T>(sql: string | null, operation: () => Promise<T>): Promise<T> {
		// If sql is provided and it's a read operation, execute immediately
		if (sql !== null && !isWriteOperation(sql)) {
			return await operation();
		}

		// Queue write operations
		return await new Promise<T>((resolve, reject) => {
			queue.push({
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
		return queue.length;
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

export type WriteQueue = ReturnType<typeof createWriteQueue>;
