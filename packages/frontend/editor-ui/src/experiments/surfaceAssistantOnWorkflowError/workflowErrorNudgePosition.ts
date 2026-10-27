// Experiment cleanup (119_surface_assistant_on_workflow_error)
// Re-stacks the error toasts after the "Fix with n8n Assistant" button is added, so the gap between toasts stays symmetrical.
export const WORKFLOW_ERROR_NUDGE_GAP_PX = 16;

export function restackContentToasts(toasts: HTMLElement[]) {
	const ordered = toasts
		.filter((toast) => Number.isFinite(Number.parseFloat(toast.style.bottom)))
		.sort((a, b) => Number.parseFloat(a.style.bottom) - Number.parseFloat(b.style.bottom));

	let offsetPx = WORKFLOW_ERROR_NUDGE_GAP_PX;
	for (const toast of ordered) {
		toast.style.bottom = `${offsetPx}px`;
		offsetPx += toast.offsetHeight + WORKFLOW_ERROR_NUDGE_GAP_PX;
	}
}
