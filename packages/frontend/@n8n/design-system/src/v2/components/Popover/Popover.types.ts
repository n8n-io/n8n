import type { CSSProperties } from 'vue';

export type PopoverPlacement =
	| 'top'
	| 'top-start'
	| 'top-end'
	| 'bottom'
	| 'bottom-start'
	| 'bottom-end'
	| 'left'
	| 'left-start'
	| 'left-end'
	| 'right'
	| 'right-start'
	| 'right-end';

export type PopoverTrigger = 'click' | 'hover';

export interface N8nPopoverProps {
	/** Controlled visibility state. Supports two-way binding via `v-model:visible`. */
	visible?: boolean;
	/** How to trigger the popover. Default: 'click' */
	trigger?: PopoverTrigger;
	/** Position of popover relative to trigger. Default: 'bottom' */
	placement?: PopoverPlacement;
	/** Popover width. Can be a number (pixels) or string (e.g., 'auto', '304px'). */
	width?: string | number;
	/** Custom CSS class name for the popover content element. */
	contentClass?: string;
	/** Inline styles object for the popover content element. */
	contentStyle?: CSSProperties;
	/** Whether to append the popover to the body element. Default: true */
	teleported?: boolean;
	/** Whether to show the arrow pointing to the trigger. Default: true */
	showArrow?: boolean;
	/** Offset of the popover from the trigger element (in pixels). */
	offset?: number;
}

export interface N8nPopoverEmits {
	/** Emitted when visibility changes. Used with `v-model:visible`. */
	(e: 'update:visible', value: boolean): void;
	/** Emitted before the popover enter animation starts. */
	(e: 'before-enter'): void;
	/** Emitted after the popover leave animation completes. */
	(e: 'after-leave'): void;
}

export interface N8nPopoverSlots {
	/** The trigger element that activates the popover (required). */
	reference: () => void;
	/** The popover content. Receives `{ close: () => void }` scope for programmatic closing. */
	default: (props: { close: () => void }) => void;
}
