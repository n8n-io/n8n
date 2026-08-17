import { ref } from 'vue';
import type { CanvasTidyUpEvent } from './canvas.types';

export type PendingCanvasTidyUp = CanvasTidyUpEvent & {
	/** Only the canvas rendering this workflow may consume the request. */
	workflowId: string;
};

/**
 * Single-slot, consumable tidy-up request. Unlike a `canvasEventBus` emit —
 * which is dropped when no Canvas listener is mounted — a request parked here
 * survives canvas remounts (the Instance AI preview remounts NodeView on every
 * workflow refresh) and is consumed by the next matching Canvas.
 */
const pendingCanvasTidyUp = ref<PendingCanvasTidyUp | null>(null);

export function requestCanvasTidyUp(request: PendingCanvasTidyUp): void {
	pendingCanvasTidyUp.value = request;
}

/** Reactive read access for the consumer (Canvas) to watch. */
export function usePendingCanvasTidyUp() {
	return pendingCanvasTidyUp;
}

/**
 * Atomically take the pending request when it targets the given workflow.
 * Returns null (and leaves the slot untouched) otherwise.
 */
export function consumePendingCanvasTidyUp(workflowId: string): CanvasTidyUpEvent | null {
	const pending = pendingCanvasTidyUp.value;
	if (!pending || pending.workflowId !== workflowId) {
		return null;
	}

	pendingCanvasTidyUp.value = null;
	return pending;
}
