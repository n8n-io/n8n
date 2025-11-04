<script lang="ts" setup>
import { ref } from 'vue';

import { N8nIconButton } from '@n8n/design-system/components';
import type { IMenuItem } from '@n8n/design-system/types';

import MenuItem from '../MenuItem/MenuItem.vue';

const items = ref<IMenuItem[]>([
	{
		id: 'menu-item-1',
		label: 'Menu Item 1',
		icon: 'home',
		route: { to: '/home' },
	},
	{
		id: 'menu-item-2',
		label: 'Menu Item 2',
		icon: { type: 'emoji', value: '🔥' },
		route: { to: '/fire' },
	},
	{
		id: 'menu-item-3',
		label: 'Menu Item 3',
		icon: { type: 'icon', value: 'settings' },
		route: { to: '/settings' },
	},
	{
		id: 'menu-item-4',
		label: 'Menu Item 4',
	},
	{
		id: 'menu-item-5',
		label: 'Dashboard',
		icon: 'layers',
		route: { to: '/dashboard' },
	},
	{
		id: 'menu-item-6',
		label: 'User Management and Administration Portal',
		icon: { type: 'emoji', value: '👥' },
		route: { to: '/users' },
	},
	{
		id: 'menu-item-7',
		label: 'Reports',
		icon: { type: 'icon', value: 'file-text' },
	},
	{
		id: 'menu-item-8',
		label: 'Analytics & Performance Monitoring Dashboard',
		icon: 'layers',
		route: { to: '/analytics' },
	},
	{
		id: 'menu-item-9',
		label: 'Help',
		icon: { type: 'emoji', value: '❓' },
	},
	{
		id: 'menu-item-10',
		label: 'Notifications',
		icon: { type: 'icon', value: 'bell' },
		route: { to: '/notifications' },
	},
	{
		id: 'menu-item-11',
		label: 'Advanced Configuration and System Preferences',
		icon: 'cog',
	},
	{
		id: 'menu-item-12',
		label: 'Log',
		icon: { type: 'emoji', value: '📋' },
		route: { to: '/logs' },
	},
	{
		id: 'menu-item-13',
		label: 'Security & Compliance Management Center',
		icon: { type: 'icon', value: 'layers' },
		route: { to: '/security' },
	},
	{
		id: 'menu-item-14',
		label: 'API',
		icon: 'code',
	},
	{
		id: 'menu-item-15',
		label: 'Workflow Templates and Automation Library',
		icon: { type: 'emoji', value: '🔄' },
		route: { to: '/templates' },
	},
	{
		id: 'menu-item-16',
		label: 'Profile',
		icon: { type: 'icon', value: 'user' },
		route: { to: '/profile' },
	},
	{
		id: 'menu-item-17',
		label: 'Database Connection and Integration Manager',
		icon: 'database',
	},
	{
		id: 'menu-item-18',
		label: 'Docs',
		icon: { type: 'emoji', value: '📚' },
		route: { to: '/documentation' },
	},
	{
		id: 'menu-item-19',
		label: 'Project Management and Collaboration Workspace',
		icon: { type: 'icon', value: 'at-sign' },
		route: { to: '/projects' },
	},
	{
		id: 'menu-item-20',
		label: 'Exit',
		icon: 'sign-out-alt',
	},
	{
		id: 'menu-item-21',
		label: 'Enterprise Resource Planning and Business Intelligence',
		icon: { type: 'emoji', value: '🏢' },
		route: { to: '/erp' },
	},
	{
		id: 'menu-item-22',
		label: 'Tags',
		icon: { type: 'icon', value: 'ban' },
	},
	{
		id: 'menu-item-23',
		label: 'Customer Relationship Management and Sales Pipeline',
		icon: 'handshake',
		route: { to: '/crm' },
	},
	{
		id: 'menu-item-24',
		label: 'Export Data and Reporting Tools Suite',
		icon: { type: 'emoji', value: '📤' },
		route: { to: '/export' },
	},
]);
</script>

<template>
	<div class="wrapper">
		<MenuItem v-for="item in items" :key="item.id" :item="item" as="button">
			<template #chevron-button>
				<N8nIconButton
					size="mini"
					type="highlight"
					icon="chevron-right"
					icon-size="medium"
					aria-label="Go to details"
				/>
			</template>
			<template #secondary>
				<N8nIconButton
					size="mini"
					type="highlight"
					icon="ellipsis"
					icon-size="medium"
					aria-label="Go to details"
				/>
			</template>
			<template #tertiary>
				<N8nIconButton
					size="mini"
					type="highlight"
					icon="plus"
					icon-size="medium"
					aria-label="Go to details"
				/>
			</template>
		</MenuItem>
	</div>
</template>

<style scoped>
.wrapper {
	display: flex;
	flex-direction: column;
	gap: 1px;
	width: 250px;
	padding: 4px;
	border-right: 1px solid var(--color--foreground);
	overflow: hidden;
}
</style>
