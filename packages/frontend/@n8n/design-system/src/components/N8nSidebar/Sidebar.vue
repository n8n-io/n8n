<script lang="ts" setup>
import { TreeItemType } from '.';
import N8nIcon from '../N8nIcon';
import { IconName } from '../N8nIcon/icons';
import N8nLogo from '../N8nLogo';
import N8nText from '../N8nText';
import SidebarSection from './SidebarSection.vue';

const props = defineProps<{
	personal: { id: string; items: TreeItemType[] };
	shared: TreeItemType[];
	projects: { title: string; id: string; icon: IconName; items: TreeItemType[] }[];
	collapsed?: boolean;
	releaseChannel: 'stable' | 'dev' | 'beta' | 'nightly';
}>();
</script>

<template>
	<nav class="sidebar">
		<header class="sidebarHeader">
			<N8nLogo
				location="sidebar"
				:collapsed="props.collapsed ?? false"
				:release-channel="props.releaseChannel"
			/>
		</header>
		<div class="sidebarItem">
			<div class="icon">
				<N8nIcon icon="house" />
			</div>
			<N8nText>Overview</N8nText>
		</div>
		<SidebarSection
			title="Personal"
			:id="personal.id"
			icon="user"
			:items="personal.items"
			:selectable="false"
			:collapsible="false"
		/>

		<SidebarSection
			title="Shared with me"
			id="shared"
			icon="share"
			:items="shared"
			:selectable="false"
			:collapsible="false"
		/>
		<N8nText size="small" bold color="text-light" class="sidebarSubheader">Projects</N8nText>
		<SidebarSection
			v-for="project in props.projects"
			:title="project.title"
			:id="project.id"
			:icon="project.icon"
			:key="project.id"
			:items="project.items"
			:selectable="false"
			:collapsible="false"
		/>
	</nav>
</template>

<style scoped>
.sidebar {
	padding: 12px;
	background-color: var(--color-background-xlight);
	position: relative;
	height: 100%;
	border-right: 1px solid var(--color-foreground-base);
	width: 300px;
}

.sidebarHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.sidebarItem {
	display: flex;
	align-items: center;
	padding: 4px;
	gap: 4px;
}

.sidebarItem .icon {
	width: 16px;
	height: 16px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.sidebarSubheader {
	margin: 16px 0 8px;
	display: block;
}
</style>
