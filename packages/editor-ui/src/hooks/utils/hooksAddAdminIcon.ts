import { useWebhooksStore } from '@/stores/webhooks';

let adminIconAdded = false;

export const hooksAddAdminIcon = () => {
	if (adminIconAdded) {
		return;
	}

	const store = useWebhooksStore();

	if (store.globalRoleName && store.globalRoleName !== 'owner') {
		return;
	}

	store.addSidebarMenuItems([
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
	]);

	adminIconAdded = true;
};
