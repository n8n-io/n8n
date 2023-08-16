import { useUIStore } from '@/stores/ui.store';
import type { IMenuItem } from 'n8n-design-system/types';
import { useUsersStore } from '@/stores/users.store';

let adminIconAdded = false;

export const hooksAddAdminIcon = () => {
	if (adminIconAdded) {
		return;
	}

	const uiStore = useUIStore();
	const usersStore = useUsersStore();

	if (usersStore?.globalRoleName !== 'owner') {
		return;
	}

	const menuItems: IMenuItem[] = [
		{
			id: 'admin',
			type: 'link',
			position: 'bottom',
			label: 'Admin Panel',
			icon: 'home',
			properties: {
				href: 'https://app.n8n.cloud',
				newWindow: false,
			},
		},
	];
	uiStore.sidebarMenuItems = [...uiStore.sidebarMenuItems, ...menuItems];
	adminIconAdded = true;
};
