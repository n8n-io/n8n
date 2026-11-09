export type ModalSidebarSide = 'left' | 'right';

export interface ModalSidebarProps {
	/**
	 * Side of the parent this sidebar sits on.
	 * The resize handle is on the inner edge.
	 * Place the component on that side of the parent. The component does not move itself.
	 */
	side?: ModalSidebarSide;
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
