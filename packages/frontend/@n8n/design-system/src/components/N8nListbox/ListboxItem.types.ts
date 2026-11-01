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
};

export type ListboxItemEmits = {
	/**
	 * The user activates the item.
	 * Call `preventDefault` on the event to keep the current value.
	 */
	select: [event: Event];
};

export type ListboxItemSlots = {
	/** Row content.*/
	default(): unknown;
};
