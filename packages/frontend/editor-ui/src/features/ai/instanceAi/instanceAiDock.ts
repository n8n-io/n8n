import { readonly, ref } from 'vue';

/** Launcher circle diameter. */
export const INSTANCE_AI_LAUNCHER_SIZE = 52;
/** Inset from the viewport edges — keeps the dock clear of corner chrome / logs. */
export const INSTANCE_AI_DOCK_EDGE_INSET = 24;
/** Gap between the launcher stack and the floating panel opened above it. */
export const INSTANCE_AI_DOCK_GAP = 12;

/**
 * Top edge of the dock stack (launcher plus any stacked offer bubble), measured
 * from the viewport floor. `0` when the dock isn't rendered.
 *
 * Module-scoped because the dock mounts once in `App.vue`, while other
 * bottom-right chrome — toasts — has to stay clear of whatever it currently
 * occupies. Measured rather than derived so a stacked offer bubble counts too.
 */
const dockTopEdge = ref(0);

export function setInstanceAiDockTopEdge(value: number) {
	dockTopEdge.value = value;
}

export function useInstanceAiDockTopEdge() {
	return readonly(dockTopEdge);
}

export type InstanceAiDockViewport = {
	width: number;
	height: number;
};

/**
 * Layout for the floating panel when it is docked to the launcher: same right
 * inset as the launcher circle, sitting `gap` above the launcher stack (circle
 * + logs offset). Height is capped so a tall default never climbs to the top
 * of the viewport and leaves a dead band above the launcher.
 *
 * Uses `clientWidth` / `clientHeight` so left/top math matches `position: fixed;
 * right/bottom` used by the launcher (avoids scrollbar-width drift from
 * `window.innerWidth`).
 */
export function getDockedPanelGeometry(options: {
	panelWidth: number;
	panelHeight: number;
	minHeight: number;
	launcherSize: number;
	edgeInset: number;
	gap: number;
	/** Bottom offset already including the edge inset (logs height + inset). */
	dockBottomOffset: number;
	viewport?: InstanceAiDockViewport;
}): { x: number; y: number; width: number; height: number } {
	const viewport = options.viewport ?? {
		width: document.documentElement.clientWidth,
		height: document.documentElement.clientHeight,
	};

	const launcherStack = options.launcherSize + options.dockBottomOffset + options.gap;
	const width = options.panelWidth;
	const maxHeight = Math.max(
		options.minHeight,
		viewport.height - launcherStack - options.edgeInset,
	);
	const height = Math.min(options.panelHeight, maxHeight);

	return {
		x: Math.max(options.edgeInset, viewport.width - width - options.edgeInset),
		y: Math.max(options.edgeInset, viewport.height - height - launcherStack),
		width,
		height,
	};
}
