import { readonly, ref } from 'vue';

// One open state for the whole editor. The pill, the publish tooltip and workflow settings open
// the same findings dialog, which the shell mounts once on the canvas. The state outlives a
// route change, so a dialog opened before the canvas mounts shows when it mounts.
const isOpen = ref(false);

/** The open state of the engine v2 findings dialog, shared by every caller. */
export function useEngineV2FindingsDialog() {
	return {
		isOpen: readonly(isOpen),
		open() {
			isOpen.value = true;
		},
		close() {
			isOpen.value = false;
		},
	};
}
