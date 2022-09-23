export interface IMenuItem {
	id: string;
	label: string;
	icon?: string;
	position?: 'top' | 'bottom';
	type: 'default' | 'link';
	properties: ILinkMenuItemProperties;
	children: IMenuItem[],
}

export interface ILinkMenuItemProperties {
	href: string;
	newWindow?: boolean;
}
