import type { ActionToggleItem } from '../N8nActionToggle/ActionToggle.types';

export type VersionHistoryStatus = 'published' | 'latest' | 'default';

/** Tooltip shown for a version row. The caller writes both lines. */
export interface VersionHistoryTooltip {
	/** First line. The status dot sits before this text. */
	title: string;
	/** Second line, such as who published the version and when. */
	detail?: string;
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
	 * Menu items for the row. Each item is an `ActionToggleItem`, so `icon` draws an icon before the label.
	 * The row hides the menu when this list is empty.
	 * The compare control stays. Use the `actions` slot to replace both controls.
	 */
	actions?: Array<ActionToggleItem<string>>;
	/** The user cannot select this row. Compare and the menu stay available. */
	disabled?: boolean;
	/** Disable the compare control for this row. */
	compareDisabled?: boolean;
	/**
	 * Tooltip for the compare control.
	 * A line break starts a second line.
	 * The accessible name stays "Compare".
	 */
	compareTooltip?: string;
	/**
	 * Tooltip for the row.
	 * The list shows it to the left of the row.
	 */
	tooltip?: VersionHistoryTooltip;
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
	 * Pass it to control the selection. Set it to the current version so the list opens on that row.
	 * Omit it and the list keeps the row the user selects.
	 * A group that contains the open version starts open.
	 */
	selectedId?: string;
	/**
	 * Id of the row to bring into view.
	 * The list scrolls when this id changes. It does not follow the open version.
	 * A group that contains this id opens before the scroll.
	 * The id can be a version, a group, or a heading.
	 * A heading above the row stays in view. The row starts below that heading.
	 * Call `scrollTo` to scroll to the same id again.
	 */
	scrollToId?: string;
	/**
	 * Id of the version selected on first render.
	 * Use this when the parent does not pass `selectedId`.
	 * The list keeps the row the user selects after that.
	 * A passed `selectedId` replaces this value.
	 */
	defaultSelectedId?: string;
	/** Accessible name for the list. */
	label?: string;
	/**
	 * Show skeleton rows while versions load.
	 * The list and the empty state stay hidden.
	 */
	loading?: boolean;
	/** Accessible name for the loading state. */
	loadingLabel?: string;
	/**
	 * More versions can be loaded.
	 * The list emits loadMore when the end is near the bottom of the scroll area.
	 */
	hasMore?: boolean;
	/**
	 * A later page is loading.
	 * The rows stay visible. A status appears at the end of the list.
	 */
	loadingMore?: boolean;
	/** Accessible name for the status at the end of the list. */
	loadingMoreLabel?: string;
	/**
	 * Show the compare control on each version.
	 * Set this to false to hide compare and keep the menu.
	 */
	showCompare?: boolean;
}
