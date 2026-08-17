import { ref } from 'vue';
import type { CanvasTidyUpEvent } from './canvas.types';

export type PendingCanvasTidyUp = CanvasTidyUpEvent & {
	/** Only the canvas rendering this workflow may consume the request. */
	workflowId: string;
};

// Single-slot, consumable request. Unlike a canvasEventBus emit — dropped when
// no Canvas is mounted — a request parked here survives canvas remounts and is
// consumed by the next matching Canvas.
const pendingCanvasTidyUp = ref<PendingCanvasTidyUp | null>(null);

export function requestCanvasTidyUp(request: PendingCanvasTidyUp): void {
	pendingCanvasTidyUp.value = request;
}

export function usePendingCanvasTidyUp() {
	return pendingCanvasTidyUp;
}

export function consumePendingCanvasTidyUp(workflowId: string): CanvasTidyUpEvent | null {
	const pending = pendingCanvasTidyUp.value;
	if (!pending || pending.workflowId !== workflowId) {
		return null;
	}

	pendingCanvasTidyUp.value = null;
	return pending;
}
