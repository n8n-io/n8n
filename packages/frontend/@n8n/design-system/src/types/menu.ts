import type { ElTooltipProps } from 'element-plus';
import type { AnchorHTMLAttributes, Component } from 'vue';
import type { RouteLocationRaw, RouterLinkProps } from 'vue-router';

import type { IconColor } from './icon';

export type IMenuItem = {
	id: string;
	label: string;
	icon?: string | { type: 'icon' | 'emoji'; value: string; color?: IconColor };
	secondaryIcon?: {
		name: string;
		size?: 'xsmall' | 'small' | 'medium' | 'large';
		tooltip?: Partial<ElTooltipProps>;
	};
	customIconSize?: 'medium' | 'small';
	available?: boolean;
	position?: 'top' | 'bottom';

	/** Use this for external links */
	link?: ILinkMenuItemProperties;
	/** Use this for defining a vue-router target */
	route?: RouterLinkProps;
	/**
	 * If given, item will be activated on these route names. Note that if
	 * route is provided, it will be highlighted automatically
	 */
	activateOnRouteNames?: string[];
	activateOnRoutePaths?: string[];

	children?: IMenuElement[];
	isLoading?: boolean;
	disabled?: boolean;
	notification?: boolean;
	size?: 'medium' | 'small';
};

export interface ICustomMenuItem {
	id: string;
	component: Component;
	props?: Record<string, unknown>;
	available?: boolean;
	position?: 'top' | 'bottom';
}

export type IMenuElement = IMenuItem | ICustomMenuItem;

export const isCustomMenuItem = (e: IMenuElement): e is ICustomMenuItem => 'component' in e;

export type IRouteMenuItemProperties = {
	route: RouteLocationRaw;
};

export type ILinkMenuItemProperties = {
	href: string;
	target?: AnchorHTMLAttributes['target'];
	rel?: AnchorHTMLAttributes['rel'];
};
