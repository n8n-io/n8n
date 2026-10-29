import type { IconName } from '../N8nIcon/icons';

export type VersionHistoryStatus = 'published' | 'latest' | 'default';

/** One entry in a version menu. */
export interface VersionHistoryAction {
	/** Id sent on the action event. */
	id: string;
	/** Label in the menu. */
	label: string;
	/** Icon name shown before the label. */
	icon?: IconName;
	/** The user cannot choose this action. */
	disabled?: boolean;
}

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
	 * Menu items for the row. Set `icon` to an icon name to draw an icon before the label.
	 * The row hides the menu when this list is empty.
	 * The compare control stays. Use the `actions` slot to replace both controls.
	 */
	actions?: VersionHistoryAction[];
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

/** A label that ends the line. The next mark starts a new line. */
export interface VersionHistoryHeading {
	type: 'heading';
	/** Stable id. Unique across versions, groups, and headings in the list. */
	id: string;
	/** Text for the heading. */
	label: string;
}

/** A version row, a collapsed group, or a heading that breaks the line. */
export type VersionHistoryEntry = VersionHistoryItem | VersionHistoryGroup | VersionHistoryHeading;

export function isVersionHistoryGroup(entry: VersionHistoryEntry): entry is VersionHistoryGroup {
	return 'type' in entry && entry.type === 'group';
}

export function isVersionHistoryHeading(
	entry: VersionHistoryEntry,
): entry is VersionHistoryHeading {
	return 'type' in entry && entry.type === 'heading';
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
