import type { IN8nButton } from '../../types';

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
	/** Whether the mouse can enter the tooltip content area */
	enterable?: boolean;
	/** Whether to append the tooltip to the body */
	teleported?: boolean;
	/** Offset of the tooltip from the trigger element (in pixels) */
	offset?: number;
	/** Array of action buttons to render below tooltip content */
	buttons?: IN8nButton[];
	/** Flex justify-content for buttons container */
	justifyButtons?: Justify;
	/** Whether to avoid collisions with viewport boundaries (flip/shift). Default: true */
	avoidCollisions?: boolean;
	/** Additional CSS class for the tooltip content */
	contentClass?: string;
}

export interface N8nTooltipSlots {
	/** The trigger element that activates the tooltip (required) */
	default: () => void;
	/** Custom content for the tooltip body. When not provided, renders content prop with HTML sanitization */
	content: () => void;
}
