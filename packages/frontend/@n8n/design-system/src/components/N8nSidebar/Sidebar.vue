<script lang="ts" setup>
import { TreeItemType } from '.';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';
import SidebarSection from './SidebarSection.vue';

const props = defineProps<{
	personal: TreeItemType[];
	shared: TreeItemType[];
	projects: { title: string; id: string; icon: 'string'; items: TreeItemType[] }[];
}>();
</script>

<template>
	<nav class="sidebar">
		<header class="sidebarItem">
			<div class="icon">
				<N8nIcon icon="house" />
			</div>
			<N8nText>Overview</N8nText>
		</header>
		<SidebarSection
			title="Personal"
			id="personal"
			icon="user"
			:items="props.personal"
			:selectable="false"
			:collapsible="false"
		/>

		<SidebarSection
			title="Shared with me"
			id="shared"
			icon="share"
			:items="props.shared"
			:selectable="false"
			:collapsible="false"
		/>
		<N8nText size="small" bold color="text-light" class="sidebarSubheader">Projects</N8nText>
		<SidebarSection
			v-for="project in props.projects"
			:title="project.title"
			:id="project.id"
			:key="project.id"
			:items="project.items"
			:selectable="false"
			:collapsible="false"
		/>
	</nav>
</template>

<style scoped>
.sidebarItem {
	display: flex;
	align-items: center;
	padding: 4px;
}

.sidebarItem .icon {
	width: 26px;
	height: 26px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.sidebarSubheader {
	margin: 16px 0 8px;
	display: block;
}
</style>
