import type { Component } from 'vue';
import type { PrimitiveProps } from 'reka-ui';

import type { IMenuItem } from '@n8n/design-system/types';

/**
 * Discriminated union for different MenuItem component types
 * Provides proper TypeScript autocomplete for element-specific props
 */
type MenuItemAsButton = {
	as?: 'button';
	type?: 'button' | 'submit' | 'reset';
	disabled?: boolean;
} & PrimitiveProps;

type MenuItemAsLink = {
	as: 'a';
	href: string;
	target?: string;
	rel?: string;
} & PrimitiveProps;

type MenuItemAsComponent = {
	as: Component;
} & PrimitiveProps;

export type MenuItemProps = MenuItemAsButton | MenuItemAsLink | MenuItemAsComponent;

export interface MenuItemBaseProps {
	item: IMenuItem;
	collapsed?: boolean;
}

export type N8nMenuItemProps = MenuItemProps & MenuItemBaseProps;

/**
 * MenuItem component emits
 */
export type N8nMenuItemEmits = {
	/**
	 * Emitted when the menu item is clicked (for buttons and links)
	 */
	click: [event: MouseEvent];
	/**
	 * Emitted when the menu item is selected (for dropdown items)
	 */
	select: [event: Event];
};

export { default as MenuItem } from './MenuItem.vue';
