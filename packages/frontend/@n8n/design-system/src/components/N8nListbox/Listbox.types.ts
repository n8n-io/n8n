export type ListboxValue = string;

export type ListboxOrientation = 'vertical' | 'horizontal';

/** How a second activation treats the current value. */
export type ListboxSelectionBehavior = 'replace' | 'toggle';

export type ListboxProps = {
	/** The selected value. Bind it with `v-model`. */
	modelValue?: ListboxValue;
	/** The selected value on first render. Use it when the parent does not bind `v-model`. */
	defaultValue?: ListboxValue;
	/** Accessible name for the list. */
	label?: string;
	/** The user cannot move the highlight or change the value. */
	disabled?: boolean;
	/**
	 * `replace` keeps one value.
	 * `toggle` clears the value when the user activates the selected item.
	 */
	selectionBehavior?: ListboxSelectionBehavior;
	/** Up and down, or left and right, move the highlight. */
	orientation?: ListboxOrientation;
	/** Reading direction. Omit it to inherit the page direction. */
	dir?: 'ltr' | 'rtl';
	/** Pointer movement moves the highlight. */
	highlightOnHover?: boolean;
};

export type ListboxSlots = {
	/** Items to show in the list. */
	default(): unknown;
};
