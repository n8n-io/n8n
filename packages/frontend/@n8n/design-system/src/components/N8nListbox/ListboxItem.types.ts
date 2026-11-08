import type { IconName } from '../N8nIcon/icons';
import type { ListboxValue } from './Listbox.types';

export type ListboxItemProps = {
	/** Unique value this item selects. */
	value: ListboxValue;
	/**
	 * The user cannot highlight or select this item. Arrow keys skip it.
	 * Tab from another item skips it when an enabled item follows.
	 * A click does not change the value.
	 * @default false
	 */
	disabled?: boolean;
	/**
	 * Icon before the row content.
	 * The leading slot replaces this icon.
	 */
	icon?: IconName;
};

export type ListboxItemEmits = {
	/**
	 * The user activates the item.
	 * Call `preventDefault` on the event to keep the current value.
	 */
	select: [event: Event];
};

export type ListboxItemSlots = {
	/** Row content. Direct children stack in a column. */
	default(): unknown;
	/**
	 * Content before the row content.
	 * This slot replaces the icon.
	 */
	leading(): unknown;
	/** Content after the row content. */
	trailing(): unknown;
};
