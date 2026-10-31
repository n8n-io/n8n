import type { ListboxValue } from './Listbox.types';

export type ListboxItemProps = {
	/** Value this item selects. Unique among the items in the list. */
	value: ListboxValue;
	/** The user cannot highlight or select this item. Arrow keys skip it. */
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
	/** Row content. The item has no padding. The highlight and the focus ring cover this content. */
	default(): unknown;
};
