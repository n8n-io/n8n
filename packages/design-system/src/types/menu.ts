export type IMenuItem = {
	id: string;
	label: string;
	icon?: string;
	available?: boolean;
	position?: 'top' | 'bottom';
	type?: 'default' | 'link';
	properties?: ILinkMenuItemProperties;
	activationRoutes?: string[],
	children?: IMenuItem[],
}

export type ILinkMenuItemProperties = {
	href: string;
	newWindow?: boolean;
}
