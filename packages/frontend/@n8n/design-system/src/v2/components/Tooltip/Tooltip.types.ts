import type { TooltipRootProps, TooltipRootEmits, TooltipContentProps } from 'reka-ui';
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

export interface N8nTooltipProps extends Omit<TooltipRootProps, 'open'> {
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
	/** Popper.js configuration object for advanced positioning control */
	popperOptions?: Partial<TooltipContentProps>;
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

export type N8nTooltipEmits = TooltipRootEmits;

export interface N8nTooltipSlots {
	/** The trigger element that activates the tooltip (required) */
	default: () => void;
	/** Custom content for the tooltip body. When not provided, renders content prop with HTML sanitization */
	content: () => void;
}
