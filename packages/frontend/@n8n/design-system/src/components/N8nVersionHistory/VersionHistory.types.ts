import type { ActionToggleItem } from '../N8nActionToggle/ActionToggle.types';

export type VersionHistoryStatus = 'published' | 'latest' | 'default';
export interface VersionHistoryItem {
	/** Stable id for the version. Unique across versions and groups in the list. */
	id: string;
	/** Primary label, such as "v1" or a version name. */
	label: string;
	/** Text after the label, such as "Latest" or "In published agent". */
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
	 * Menu items for the row. Each item is an `ActionToggleItem`, so `icon` draws an icon before the label.
	 * The row hides the menu when this list is empty.
	 * The compare control stays. Use the `actions` slot to replace both controls.
	 */
	actions?: Array<ActionToggleItem<string>>;
	/** The user cannot select this row. Compare and the menu stay available. */
	disabled?: boolean;
	/** Disable the compare control for this row. */
	compareDisabled?: boolean;
	/** Disable the menu for this row. */
	actionsDisabled?: boolean;
}

export interface VersionHistoryGroup {
	type: 'group';
	/** Stable id for the toggle. Unique across versions and groups in the list. */
	id: string;
	/** Text on the toggle. */
	label: string;
	/** Versions the toggle reveals. Newest first. */
	items: VersionHistoryItem[];
}

/** A version row, or a collapsed group of version rows. */
export type VersionHistoryEntry = VersionHistoryItem | VersionHistoryGroup;

export function isVersionHistoryGroup(entry: VersionHistoryEntry): entry is VersionHistoryGroup {
	return 'type' in entry && entry.type === 'group';
}

export interface VersionHistoryActionPayload {
	/** Id of the version the action belongs to. */
	id: string;
	/** Id of the chosen action. */
	action: string;
}

export interface VersionHistoryTogglePayload {
	/** Id of the group. */
	id: string;
	/** True when the group is open after the toggle. */
	expanded: boolean;
}

export interface VersionHistoryProps {
	/** Versions, newest first. A group hides its versions until the user opens it. */
	items: VersionHistoryEntry[];
	/**
	 * Id of the open version.
	 * Pass it to control the selection. Omit it and the list keeps the row the user selects.
	 * A group that contains the open version starts open.
	 */
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
}
