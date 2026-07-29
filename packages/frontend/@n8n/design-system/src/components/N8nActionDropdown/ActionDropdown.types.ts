import type { ActionDropdownItem, ButtonSize, IconSize } from '../../types';
import type { IconName } from '../N8nIcon/icons';

export type ActionDropdownTrigger = 'click' | 'hover';

export interface ActionDropdownProps<T extends string> {
	items: Array<ActionDropdownItem<T>>;
	placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';
	activatorIcon?: IconName;
	activatorSize?: ButtonSize;
	iconSize?: IconSize;
	trigger?: ActionDropdownTrigger;
	teleported?: boolean;
	disabled?: boolean;
	extraPopperClass?: string;
	maxHeight?: string | number;
	width?: string;
	modal?: boolean;
}
