import type { ActionDropdownItem, ButtonSize, IconSize } from '../../types';
import type { IconName } from '../N8nIcon/icons';

/** Extracted from the SFC so the generic props are nameable in the emitted declaration (TS4082). */
export interface ActionDropdownProps<T extends string = string> {
	items: Array<ActionDropdownItem<T>>;
	placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';
	activatorIcon?: IconName;
	activatorSize?: ButtonSize;
	iconSize?: IconSize;
	trigger?: 'click' | 'hover';
	teleported?: boolean;
	disabled?: boolean;
	extraPopperClass?: string;
	maxHeight?: string | number;
	width?: string;
	modal?: boolean;
}
