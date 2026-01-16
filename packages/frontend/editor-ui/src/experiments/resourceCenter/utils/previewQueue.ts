/**
 * Preview Queue Manager
 *
 * Manages a queue of workflow previews to render, limiting concurrent renders
 * to avoid overwhelming the browser with too many iframes.
 */

type QueueCallback = () => void;

interface QueueItem {
	id: string;
	onReady: QueueCallback;
}

const MAX_CONCURRENT_RENDERS = 2;

// Queue of items waiting to render
const pendingQueue: QueueItem[] = [];

// Set of currently rendering item IDs
const activeRenders = new Set<string>();

// Set of completed item IDs (already rendered)
const completedRenders = new Set<string>();

/**
 * Request permission to render a preview.
 * If under the limit, calls onReady immediately.
 * Otherwise, queues the request.
 */
export function requestRender(id: string, onReady: QueueCallback): void {
	// Already completed - call immediately
	if (completedRenders.has(id)) {
		onReady();
		return;
	}

	// Already active - don't queue again
	if (activeRenders.has(id)) {
		return;
	}

	// Already in queue - don't add again
	if (pendingQueue.some((item) => item.id === id)) {
		return;
	}

	// If we have capacity, start immediately
	if (activeRenders.size < MAX_CONCURRENT_RENDERS) {
		activeRenders.add(id);
		onReady();
	} else {
		// Add to queue
		pendingQueue.push({ id, onReady });
	}
}

/**
 * Mark a preview as finished rendering.
 * This frees up a slot for the next queued item.
 */
export function markRenderComplete(id: string): void {
	activeRenders.delete(id);
	completedRenders.add(id);
	processQueue();
}

/**
 * Cancel a pending render request (e.g., when component unmounts).
 */
export function cancelRender(id: string): void {
	activeRenders.delete(id);
	const index = pendingQueue.findIndex((item) => item.id === id);
	if (index !== -1) {
		pendingQueue.splice(index, 1);
	}
}

/**
 * Process the queue and start next renders if capacity available.
 */
function processQueue(): void {
	while (activeRenders.size < MAX_CONCURRENT_RENDERS && pendingQueue.length > 0) {
		const next = pendingQueue.shift();
		if (next) {
			activeRenders.add(next.id);
			next.onReady();
		}
	}
}

/**
 * Reset the queue (useful for testing or page navigation).
 */
export function resetQueue(): void {
	pendingQueue.length = 0;
	activeRenders.clear();
	completedRenders.clear();
}
