import type { IN8nButton } from '../../../types';

export type Placement =
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

export type Justify =
	| 'flex-start'
	| 'flex-end'
	| 'start'
	| 'end'
	| 'left'
	| 'right'
	| 'center'
	| 'space-between'
	| 'space-around'
	| 'space-evenly';

/** Props passed to TooltipContent for advanced positioning control */
export interface TooltipPopperOptions {
	/** Whether tooltip should avoid collisions with viewport edges */
	avoidCollisions?: boolean;
	/** Padding from viewport edge when avoiding collisions */
	collisionPadding?: number | { top?: number; right?: number; bottom?: number; left?: number };
	/** Whether tooltip should stick to boundary when scrolling */
	sticky?: 'partial' | 'always';
	/** Whether tooltip should hide when trigger is fully occluded */
	hideWhenDetached?: boolean;
}

export interface N8nTooltipProps {
	/** Text content for the tooltip. Supports HTML (sanitized for security). */
	content?: string;
	/** Position of tooltip relative to trigger */
	placement?: Placement;
	/** When true, prevents the tooltip from showing */
	disabled?: boolean;
	/** Delay in milliseconds before showing tooltip after trigger is hovered */
	showAfter?: number;
	/** Manual control of tooltip visibility (programmatic show/hide) */
	visible?: boolean;
	/** Custom CSS class name for the tooltip popper element */
	popperClass?: string;
	/** Whether the mouse can enter the tooltip content area */
	enterable?: boolean;
	/** Configuration object for advanced positioning control */
	popperOptions?: TooltipPopperOptions;
	/** Whether to append the tooltip to the body */
	teleported?: boolean;
	/** Offset of the tooltip from the trigger element (in pixels) */
	offset?: number;
	/** Whether to show the tooltip arrow */
	showArrow?: boolean;
	/** Array of button configurations to render at the bottom of the tooltip */
	buttons?: IN8nButton[];
	/** Horizontal alignment of buttons */
	justifyButtons?: Justify;
}

export interface N8nTooltipEmits {
	/** Emitted when tooltip visibility changes (for v-model:visible) */
	(e: 'update:visible', visible: boolean): void;
}

export interface N8nTooltipSlots {
	/** The trigger element that activates the tooltip (required) */
	default: () => void;
	/** Custom content for the tooltip body. When not provided, renders content prop with HTML sanitization */
	content: () => void;
}
