<script lang="ts" setup>
import { ref } from 'vue';

import { N8nIconButton } from '@n8n/design-system/components';
import type { IMenuItem } from '@n8n/design-system/types';

import MenuItem from '../MenuItem/MenuItem.vue';
import { Tree } from '../Tree';

const items = ref<IMenuItem[]>([
	{
		id: 'menu-item-1',
		label: 'Dashboard',
		icon: 'house',
		route: { to: '/dashboard' },
		children: [
			{
				id: 'menu-item-1-1',
				label: 'Overview',
				icon: { type: 'emoji', value: '📊' },
				route: { to: '/dashboard/overview' },
			},
			{
				id: 'menu-item-1-2',
				label: 'Analytics',
				icon: { type: 'icon', value: 'layers' },
				route: { to: '/dashboard/analytics' },
				children: [
					{
						id: 'menu-item-1-2-1',
						label: 'Performance Metrics',
						icon: { type: 'emoji', value: '⚡' },
						route: { to: '/dashboard/analytics/performance' },
					},
					{
						id: 'menu-item-1-2-2',
						label: 'User Behavior',
						icon: { type: 'icon', value: 'user' },
						route: { to: '/dashboard/analytics/behavior' },
					},
					{
						id: 'menu-item-1-2-3',
						label: 'Traffic Sources',
						icon: { type: 'emoji', value: '🚀' },
						route: { to: '/dashboard/analytics/traffic' },
						children: [
							{
								id: 'menu-item-1-2-3-1',
								label: 'Organic Search',
								route: { to: '/dashboard/analytics/traffic/organic' },
							},
							{
								id: 'menu-item-1-2-3-2',
								label: 'Direct Traffic',
								route: { to: '/dashboard/analytics/traffic/direct' },
							},
							{
								id: 'menu-item-1-2-3-3',
								label: 'Social Media',
								route: { to: '/dashboard/analytics/traffic/social' },
							},
						],
					},
				],
			},
			{
				id: 'menu-item-1-3',
				label: 'Recent Activity',
				icon: { type: 'icon', value: 'bell' },
				route: { to: '/dashboard/activity' },
			},
		],
	},
	{
		id: 'menu-item-2',
		label: 'User Management',
		icon: { type: 'emoji', value: '👥' },
		children: [
			{
				id: 'menu-item-2-1',
				label: 'Users',
				icon: { type: 'icon', value: 'user' },
				route: { to: '/users' },
				children: [
					{
						id: 'menu-item-2-1-1',
						label: 'Active Users',
						route: { to: '/users/active' },
					},
					{
						id: 'menu-item-2-1-2',
						label: 'Inactive Users',
						route: { to: '/users/inactive' },
					},
					{
						id: 'menu-item-2-1-3',
						label: 'Pending Invites',
						route: { to: '/users/pending' },
					},
				],
			},
			{
				id: 'menu-item-2-2',
				label: 'Roles & Permissions',
				icon: { type: 'emoji', value: '🔐' },
				route: { to: '/roles' },
				children: [
					{
						id: 'menu-item-2-2-1',
						label: 'Admin Roles',
						route: { to: '/roles/admin' },
					},
					{
						id: 'menu-item-2-2-2',
						label: 'User Roles',
						route: { to: '/roles/user' },
					},
					{
						id: 'menu-item-2-2-3',
						label: 'Custom Permissions',
						route: { to: '/roles/custom' },
					},
				],
			},
			{
				id: 'menu-item-2-3',
				label: 'Groups',
				icon: { type: 'icon', value: 'layers' },
				route: { to: '/groups' },
			},
		],
	},
	{
		id: 'menu-item-3',
		label: 'Content Management',
		icon: { type: 'emoji', value: '📝' },
		children: [
			{
				id: 'menu-item-3-1',
				label: 'Articles',
				icon: { type: 'icon', value: 'file-text' },
				route: { to: '/content/articles' },
				children: [
					{
						id: 'menu-item-3-1-1',
						label: 'Published',
						route: { to: '/content/articles/published' },
					},
					{
						id: 'menu-item-3-1-2',
						label: 'Drafts',
						route: { to: '/content/articles/drafts' },
					},
					{
						id: 'menu-item-3-1-3',
						label: 'Archive',
						route: { to: '/content/articles/archive' },
						children: [
							{
								id: 'menu-item-3-1-3-1',
								label: '2024',
								route: { to: '/content/articles/archive/2024' },
							},
							{
								id: 'menu-item-3-1-3-2',
								label: '2023',
								route: { to: '/content/articles/archive/2023' },
							},
						],
					},
				],
			},
			{
				id: 'menu-item-3-2',
				label: 'Media Library',
				icon: { type: 'emoji', value: '🖼️' },
				route: { to: '/content/media' },
				children: [
					{
						id: 'menu-item-3-2-1',
						label: 'Images',
						route: { to: '/content/media/images' },
					},
					{
						id: 'menu-item-3-2-2',
						label: 'Videos',
						route: { to: '/content/media/videos' },
					},
					{
						id: 'menu-item-3-2-3',
						label: 'Documents',
						route: { to: '/content/media/documents' },
					},
				],
			},
			{
				id: 'menu-item-3-3',
				label: 'Categories',
				icon: { type: 'icon', value: 'ban' },
				route: { to: '/content/categories' },
			},
		],
	},
	{
		id: 'menu-item-4',
		label: 'System',
		icon: 'cog',
		children: [
			{
				id: 'menu-item-4-1',
				label: 'Settings',
				icon: { type: 'icon', value: 'settings' },
				route: { to: '/system/settings' },
				children: [
					{
						id: 'menu-item-4-1-1',
						label: 'General',
						route: { to: '/system/settings/general' },
					},
					{
						id: 'menu-item-4-1-2',
						label: 'Security',
						route: { to: '/system/settings/security' },
					},
					{
						id: 'menu-item-4-1-3',
						label: 'Email',
						route: { to: '/system/settings/email' },
					},
				],
			},
			{
				id: 'menu-item-4-2',
				label: 'Logs',
				icon: { type: 'emoji', value: '📋' },
				route: { to: '/system/logs' },
				children: [
					{
						id: 'menu-item-4-2-1',
						label: 'Error Logs',
						route: { to: '/system/logs/errors' },
					},
					{
						id: 'menu-item-4-2-2',
						label: 'Access Logs',
						route: { to: '/system/logs/access' },
					},
					{
						id: 'menu-item-4-2-3',
						label: 'System Logs',
						route: { to: '/system/logs/system' },
					},
				],
			},
			{
				id: 'menu-item-4-3',
				label: 'Database',
				icon: 'database',
				route: { to: '/system/database' },
			},
		],
	},
	{
		id: 'menu-item-5',
		label: 'Reports',
		icon: { type: 'emoji', value: '📊' },
		route: { to: '/reports' },
		children: [
			{
				id: 'menu-item-5-1',
				label: 'Sales Reports',
				route: { to: '/reports/sales' },
			},
			{
				id: 'menu-item-5-2',
				label: 'User Reports',
				route: { to: '/reports/users' },
			},
			{
				id: 'menu-item-5-3',
				label: 'System Reports',
				route: { to: '/reports/system' },
			},
		],
	},
	{
		id: 'menu-item-6',
		label: 'Help',
		icon: { type: 'emoji', value: '❓' },
		children: [
			{
				id: 'menu-item-6-1',
				label: 'Documentation',
				icon: { type: 'emoji', value: '📚' },
				route: { to: '/help/docs' },
			},
			{
				id: 'menu-item-6-2',
				label: 'Support',
				icon: { type: 'icon', value: 'handshake' },
				route: { to: '/help/support' },
			},
			{
				id: 'menu-item-6-3',
				label: 'API Reference',
				icon: 'code',
				route: { to: '/help/api' },
			},
		],
	},
]);

function updateExpanded(expandedItems: string[]) {
	console.log('Expanded items:', expandedItems);
}

function updateModelValue(selectedItems: any) {
	console.log('Selected items:', selectedItems);
}
</script>

<template>
	<div class="wrapper">
		<Tree
			:items="items"
			@update:expanded="(e) => updateExpanded(e)"
			@update:model-value="(v) => updateModelValue(v)"
		>
			<template #default="{ item, handleToggle, isExpanded }">
				<MenuItem :key="item.value.id" :item="item.value" @mouseover="() => console.log(item._id)">
					<template v-if="item.value.children && item.value.children.length > 0" #toggle>
						<N8nIconButton
							size="mini"
							type="highlight"
							:icon="isExpanded ? 'chevron-down' : 'chevron-right'"
							icon-size="medium"
							aria-label="Go to details"
							@click="handleToggle"
						/>
					</template>
					<template #actions>
						<N8nIconButton
							size="mini"
							type="highlight"
							icon="ellipsis"
							icon-size="medium"
							aria-label="Go to details"
						/>
						<N8nIconButton
							size="mini"
							type="highlight"
							icon="plus"
							icon-size="medium"
							aria-label="Go to details"
						/>
					</template>
				</MenuItem>
			</template>
		</Tree>
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
