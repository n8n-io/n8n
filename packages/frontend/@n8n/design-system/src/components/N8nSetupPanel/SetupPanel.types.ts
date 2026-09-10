export interface SetupPanelItem {
	/** Stable identity used to keep the detail open as items change. */
	id: string;
	/** Service name or the label for a group of required fields. */
	title: string;
	/** Short description of the values that remain to be configured. */
	subtitle?: string;
	/** Whether all requirements represented by this row are configured. */
	completed: boolean;
	/** Whether the host has enough context to open this item. */
	disabled?: boolean;
	/** Whether the action slot replaces opening the detail card for this row. */
	hasAction?: boolean;
}

export interface SetupPanelProps {
	/** Checklist items in display order. */
	items: SetupPanelItem[];
	/** The item shown in the overlay, or undefined to show the checklist. */
	activeItemId?: string;
}
