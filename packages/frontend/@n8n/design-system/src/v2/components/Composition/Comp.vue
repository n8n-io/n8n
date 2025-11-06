<script lang="ts" setup>
import { ref } from 'vue';

import { N8nIconButton } from '@n8n/design-system/components';
import type { IMenuItem } from '@n8n/design-system/types';

import MenuItem from '../MenuItem/MenuItem.vue';
import { Tree } from '../Tree';

const items = ref<IMenuItem[]>([]);

const sidebarOpen = ref(true);
</script>

<template>
	<div class="nav">
		<div class="header">
			<N8nIconButton
				size="small"
				type="highlight"
				icon="panel-left"
				icon-size="large"
				aria-label="Add new item"
			/>
			<N8nIconButton
				size="small"
				type="highlight"
				icon="plus"
				icon-size="large"
				aria-label="Add new item"
			/>
			<N8nIconButton
				size="small"
				type="highlight"
				icon="search"
				icon-size="large"
				aria-label="Add new item"
			/>
		</div>
		<div class="section">
			<MenuItem
				:item="{
					id: 'Overview',
					label: 'Overview',
					icon: 'house',
				}"
			/>
			<MenuItem
				:item="{
					id: 'personal',
					label: 'Personal',
					icon: 'user',
				}"
			/>
			<MenuItem
				:item="{
					id: 'shared',
					label: 'Shared',
					icon: 'share',
				}"
			/>
		</div>
		<Tree :items="items">
			<template #default="{ item, handleToggle, isExpanded, hasChildren }">
				<MenuItem :key="item.value.id" :item="item.value">
					<template v-if="hasChildren" #toggle>
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
.nav {
	display: flex;
	flex-direction: column;
	gap: 1px;
	width: 250px;
	padding: 4px;
	border-right: 1px solid var(--color--foreground--tint-1);
	overflow: hidden;
	height: 100vh;
}

.header {
	display: flex;
	padding: 2px;
	margin-bottom: 8px;
}
</style>
