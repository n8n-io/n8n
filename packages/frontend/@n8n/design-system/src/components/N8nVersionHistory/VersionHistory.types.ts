import type { ActionToggleItem } from '../N8nActionToggle/ActionToggle.types';

/** Dot on the timeline. `default` is an empty ring. */
export type VersionHistoryStatus = 'published' | 'latest' | 'default';

/**
 * One version row.
 * The caller formats the time and chooses the actions.
 */
export interface VersionHistoryItem {
	/** Stable id for the version. */
	id: string;
	/** Primary label, such as "v1" or a version name. */
	label: string;
	/** Text after the label, such as "Latest · In published agent". */
	detail?: string;
	/** Person who saved the version. */
	author?: string;
	/** Formatted time, such as "Oct 24 at 14:28". */
	createdAt?: string;
	/** ISO time for the time element. */
	createdAtIso?: string;
	/** Timeline dot. */
	status?: VersionHistoryStatus;
	/** Accessible name for the status dot. */
	statusLabel?: string;
	/**
	 * Menu items for the row.
	 * Add an entry here to extend the menu. The row hides the menu when this list is empty.
	 * Use the `actions` slot to replace the controls instead.
	 */
	actions?: Array<ActionToggleItem<string>>;
	/** Disable the compare control for this row. */
	compareDisabled?: boolean;
	/** Disable the menu for this row. */
	actionsDisabled?: boolean;
	/** Accessible name for the compare control. Overrides the panel label. */
	compareLabel?: string;
}

export interface VersionHistoryActionPayload {
	/** Id of the version the action belongs to. */
	id: string;
	/** Id of the chosen action. */
	action: string;
}

export interface VersionHistoryProps {
	/** Versions, newest first. */
	items: VersionHistoryItem[];
	/** Id of the open version. */
	selectedId?: string;
	/** Accessible name for the list. */
	label?: string;
	/**
	 * Show skeleton rows while versions load.
	 * The list and the empty state stay hidden.
	 */
	loading?: boolean;
	/** Accessible name for the loading state. */
	loadingLabel?: string;
	/** Show a compare control on each row. */
	showCompare?: boolean;
	/** Accessible name for the compare control. */
	compareLabel?: string;
}
