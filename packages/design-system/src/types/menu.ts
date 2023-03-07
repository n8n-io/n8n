export type IMenuItem = {
	id: string;
	label: string;
	icon?: string;
	customIconSize?: 'medium' | 'small';
	available?: boolean;
	position?: 'top' | 'bottom';
	type?: 'default' | 'link';
	properties?: ILinkMenuItemProperties;
	// For router menus populate only one of those arrays:
	// If menu item can be activated on certain route names (easy mode)
	activateOnRouteNames?: string[];
	// For more specific matching, we can use paths
	activateOnRoutePaths?: string[];
	children?: IMenuItem[];
};

export type ILinkMenuItemProperties = {
	href: string;
	newWindow?: boolean;
};
