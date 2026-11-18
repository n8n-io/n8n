export type SidebarSide = 'left' | 'right';

export interface SidebarProps {
	/**
	 * Side of the parent this sidebar sits on.
	 * The resize handle is on the inner edge.
	 * Place the component on that side of the parent. The component does not move itself.
	 */
	side?: SidebarSide;
	/**
	 * Width restored on double-click.
	 * Defaults to the width at mount.
	 */
	defaultWidth?: number;
	/** Minimum width in pixels. */
	minWidth?: number;
	/** Maximum width in pixels. */
	maxWidth?: number;
	/** Show the drag handle. */
	resizable?: boolean;
	/** Accessible name for the sidebar. */
	label?: string;
}
