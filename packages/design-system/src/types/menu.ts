export type IMenuItem = {
	id: string;
	label: string;
	icon?: string;
	position?: 'top' | 'bottom';
	type?: 'default' | 'link';
	properties?: ILinkMenuItemProperties;
	children?: IMenuItem[],
}

export type ILinkMenuItemProperties = {
	href: string;
	newWindow?: boolean;
}
