export type SidebarSide = 'left' | 'right';

export interface SidebarProps {
	/**
	 * Side of the parent this sidebar sits on.
	 * The resize handle is on the inner edge.
	 * Place the component on that side of the parent.
	 * @default 'left'
	 */
	side?: SidebarSide;
	/**
	 * Current width in pixels.
	 * Bind with v-model:width.
	 * The sidebar clamps this value to minWidth and maxWidth.
	 * It emits the clamped width.
	 * @default 240
	 */
	width?: number;
	/**
	 * Local storage key for the width.
	 * The sidebar reads this key on mount.
	 * A saved width inside minWidth and maxWidth becomes the current width.
	 * The sidebar writes the width after each later change.
	 * Give each sidebar its own key.
	 * Omit this prop and the sidebar does not read or write storage.
	 */
	widthStorageId?: string;
	/**
	 * Width restored on double-click.
	 * Defaults to the width at mount, before a saved width is applied.
	 * The sidebar clamps this value to minWidth and maxWidth.
	 * The sidebar saves that restored width when widthStorageId is set.
	 */
	defaultWidth?: number;
	/**
	 * Minimum width in pixels.
	 * The width stays at or above this value.
	 * @default 160
	 */
	minWidth?: number;
	/**
	 * Maximum width in pixels.
	 * The width stays at or below this value.
	 * @default 480
	 */
	maxWidth?: number;
	/**
	 * Show the drag handle.
	 * @default true
	 */
	resizable?: boolean;
	/** Accessible name for the sidebar. */
	label?: string;
}
